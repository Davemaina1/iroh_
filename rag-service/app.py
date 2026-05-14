"""
Iroh RAG sidecar — ONNX embedding, BM25 hybrid retrieval, RRF fusion.
Loads corpus from Supabase Storage (no ChromaDB dependency).
Exposes POST /search and GET /health on port 8001.

Runs within 512MB RAM — uses onnxruntime instead of torch/sentence-transformers.
"""

import asyncio
import io
import json
import logging
import os
import re
import time
from contextlib import asynccontextmanager
from typing import Optional

import httpx
import numpy as np
import onnxruntime as ort
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from huggingface_hub import hf_hub_download
from pydantic import BaseModel
from rank_bm25 import BM25Okapi
from tokenizers import Tokenizer

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("rag-service")

# ---------------------------------------------------------------------------
# Global state
# ---------------------------------------------------------------------------

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://dslxzchimexwdyvsyiqc.supabase.co")
CORPUS_EMBEDDINGS_URL = f"{SUPABASE_URL}/storage/v1/object/public/rag-corpus/corpus_embeddings.npz"
CORPUS_DATA_URL = f"{SUPABASE_URL}/storage/v1/object/public/rag-corpus/corpus_data.npz"
MODEL_CACHE_DIR = os.path.join(os.path.dirname(__file__), ".model_cache")

state: dict = {
    "ready": False,
    "ort_session": None,
    "tokenizer": None,
    "embeddings": None,       # (N, 384) float32 normalized
    "bm25": None,
    "chunk_ids": [],
    "chunk_metadata": {},
    "chunk_text": {},
    "chunks_indexed": 0,
}


# ---------------------------------------------------------------------------
# ONNX Embedding Model
# ---------------------------------------------------------------------------

EMBED_MODEL_REPO = "sentence-transformers/all-MiniLM-L6-v2"


def _download_model():
    """Download the ONNX model and tokenizer from HuggingFace Hub."""
    os.makedirs(MODEL_CACHE_DIR, exist_ok=True)

    log.info("Downloading ONNX model from %s …", EMBED_MODEL_REPO)
    model_path = hf_hub_download(
        repo_id=EMBED_MODEL_REPO,
        filename="onnx/model.onnx",
        cache_dir=MODEL_CACHE_DIR,
    )
    tokenizer_path = hf_hub_download(
        repo_id=EMBED_MODEL_REPO,
        filename="tokenizer.json",
        cache_dir=MODEL_CACHE_DIR,
    )
    return model_path, tokenizer_path


def _create_ort_session(model_path: str) -> ort.InferenceSession:
    opts = ort.SessionOptions()
    opts.inter_op_num_threads = 1
    opts.intra_op_num_threads = 2
    opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    return ort.InferenceSession(model_path, sess_options=opts, providers=["CPUExecutionProvider"])


def _embed(texts: list[str]) -> np.ndarray:
    """Encode texts into normalized embeddings using ONNX runtime."""
    tokenizer: Tokenizer = state["tokenizer"]
    session: ort.InferenceSession = state["ort_session"]

    encoded = tokenizer.encode_batch(texts)

    max_len = min(max(len(e.ids) for e in encoded), 256)
    batch_size = len(texts)
    input_ids = np.zeros((batch_size, max_len), dtype=np.int64)
    attention_mask = np.zeros((batch_size, max_len), dtype=np.int64)
    token_type_ids = np.zeros((batch_size, max_len), dtype=np.int64)

    for i, e in enumerate(encoded):
        length = min(len(e.ids), max_len)
        input_ids[i, :length] = e.ids[:length]
        attention_mask[i, :length] = e.attention_mask[:length]

    outputs = session.run(
        None,
        {
            "input_ids": input_ids,
            "attention_mask": attention_mask,
            "token_type_ids": token_type_ids,
        },
    )

    token_embeddings = outputs[0]
    mask_expanded = attention_mask[:, :, np.newaxis].astype(np.float32)
    sum_embeddings = np.sum(token_embeddings * mask_expanded, axis=1)
    sum_mask = np.sum(mask_expanded, axis=1).clip(min=1e-9)
    mean_pooled = sum_embeddings / sum_mask

    norms = np.linalg.norm(mean_pooled, axis=1, keepdims=True).clip(min=1e-9)
    return mean_pooled / norms


# ---------------------------------------------------------------------------
# Corpus loading from Supabase Storage
# ---------------------------------------------------------------------------

def _download_file(url: str) -> bytes:
    """Download a file from a URL with retries."""
    for attempt in range(3):
        try:
            with httpx.Client(timeout=120.0) as client:
                resp = client.get(url)
                resp.raise_for_status()
                return resp.content
        except Exception as e:
            log.warning("Download attempt %d failed for %s: %s", attempt + 1, url, e)
            if attempt == 2:
                raise
            time.sleep(2)
    raise RuntimeError("Unreachable")


def _load_corpus():
    """Download and load corpus from Supabase Storage."""
    log.info("Downloading corpus embeddings …")
    t0 = time.time()
    emb_bytes = _download_file(CORPUS_EMBEDDINGS_URL)
    log.info("  Downloaded embeddings (%.1f MB) in %.1fs", len(emb_bytes) / 1024 / 1024, time.time() - t0)

    log.info("Downloading corpus data …")
    t0 = time.time()
    data_bytes = _download_file(CORPUS_DATA_URL)
    log.info("  Downloaded data (%.1f MB) in %.1fs", len(data_bytes) / 1024 / 1024, time.time() - t0)

    log.info("Loading embeddings into memory …")
    t0 = time.time()
    emb_data = np.load(io.BytesIO(emb_bytes), allow_pickle=False)
    embeddings_int8 = emb_data["embeddings_int8"]
    scales = emb_data["scales"].astype(np.float32)

    # Dequantize: int8 → float32 normalized
    embeddings = embeddings_int8.astype(np.float32) / 127.0 * scales[:, np.newaxis]
    # Re-normalize (quantization introduces small errors)
    norms = np.linalg.norm(embeddings, axis=1, keepdims=True).clip(min=1e-9)
    embeddings = embeddings / norms
    log.info("  Embeddings loaded: shape=%s in %.1fs", embeddings.shape, time.time() - t0)

    # Free raw bytes
    del emb_bytes, emb_data, embeddings_int8, scales

    log.info("Loading corpus texts and metadata …")
    t0 = time.time()
    corpus_data = np.load(io.BytesIO(data_bytes), allow_pickle=True)
    chunk_ids = corpus_data["ids"].tolist()
    chunk_texts = corpus_data["texts"].tolist()
    chunk_metas_json = corpus_data["metadatas"].tolist()
    log.info("  Corpus data loaded: %d chunks in %.1fs", len(chunk_ids), time.time() - t0)

    # Free raw bytes
    del data_bytes, corpus_data

    chunk_metadata = {}
    chunk_text = {}
    for i, cid in enumerate(chunk_ids):
        chunk_text[cid] = chunk_texts[i] or ""
        try:
            chunk_metadata[cid] = json.loads(chunk_metas_json[i])
        except (json.JSONDecodeError, TypeError):
            chunk_metadata[cid] = {}

    return chunk_ids, embeddings, chunk_metadata, chunk_text


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------

def _tokenize(text: str) -> list[str]:
    return re.findall(r"\w+", (text or "").lower())


def _startup():
    log.info("=== Iroh RAG sidecar starting (ONNX-lite, no ChromaDB) ===")

    # 1. Load ONNX embedding model
    t0 = time.time()
    model_path, tokenizer_path = _download_model()
    log.info("  Model files ready in %.1fs", time.time() - t0)

    log.info("Loading ONNX session …")
    t0 = time.time()
    state["ort_session"] = _create_ort_session(model_path)
    log.info("  ONNX session loaded in %.1fs", time.time() - t0)

    log.info("Loading tokenizer …")
    state["tokenizer"] = Tokenizer.from_file(tokenizer_path)
    state["tokenizer"].enable_truncation(max_length=256)
    state["tokenizer"].enable_padding(length=None)

    # 2. Load corpus from Supabase Storage
    chunk_ids, embeddings, chunk_metadata, chunk_text = _load_corpus()
    state["embeddings"] = embeddings
    state["chunk_ids"] = chunk_ids
    state["chunk_metadata"] = chunk_metadata
    state["chunk_text"] = chunk_text
    state["chunks_indexed"] = len(chunk_ids)

    # 3. Build BM25 index
    log.info("Building BM25 index over %d chunks …", len(chunk_ids))
    t0 = time.time()
    corpus_tokens = [_tokenize(chunk_text[cid]) for cid in chunk_ids]
    bm25 = BM25Okapi(corpus_tokens)
    state["bm25"] = bm25
    log.info("  BM25 fitted in %.1fs", time.time() - t0)

    state["ready"] = True
    log.info("=== RAG sidecar ready. %d chunks indexed. ===", state["chunks_indexed"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    await asyncio.to_thread(_startup)
    yield


app = FastAPI(title="Iroh RAG Service", lifespan=lifespan)


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------

class SearchRequest(BaseModel):
    query: str
    topK: int = 8
    jurisdictionFilter: Optional[str] = None
    bindingOnly: bool = False


class ChunkResult(BaseModel):
    chunk_id: str
    title: str
    url: Optional[str]
    source_archive: str
    type: str
    court: Optional[str]
    year: Optional[str]
    jurisdiction: str
    binding_in_kenya: bool
    citation: Optional[str]
    snippet: str
    semantic_distance: float
    bm25_score: float
    rerank_score: float


class SearchResponse(BaseModel):
    results: list[ChunkResult]
    note: Optional[str] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _str_field(meta: dict, key: str) -> Optional[str]:
    v = meta.get(key)
    return v if isinstance(v, str) and v.strip() else None


def _year_field(meta: dict) -> Optional[str]:
    y = _str_field(meta, "year")
    if y:
        return y
    d = _str_field(meta, "date")
    if d:
        m = re.search(r"\b(19|20)\d{2}\b", d)
        if m:
            return m.group(0)
    return None


def _normalize(
    chunk_id: str,
    meta: dict,
    text: str,
    semantic_distance: float,
    bm25_score: float,
    rrf_score: float,
) -> ChunkResult:
    full_text = text or ""
    snippet = full_text[:400] + ("..." if len(full_text) > 400 else "")
    return ChunkResult(
        chunk_id=chunk_id,
        title=_str_field(meta, "title") or "Untitled",
        url=_str_field(meta, "url"),
        source_archive=_str_field(meta, "source_archive") or "Kenya Law (Primary)",
        type=_str_field(meta, "type") or "case_law",
        court=_str_field(meta, "court"),
        year=_year_field(meta),
        jurisdiction=_str_field(meta, "jurisdiction") or "kenya",
        binding_in_kenya=meta["binding_in_kenya"] if isinstance(meta.get("binding_in_kenya"), bool) else True,
        citation=_str_field(meta, "citation"),
        snippet=snippet,
        semantic_distance=semantic_distance,
        bm25_score=bm25_score,
        rerank_score=rrf_score,
    )


# ---------------------------------------------------------------------------
# Search endpoint
# ---------------------------------------------------------------------------

@app.post("/search", response_model=SearchResponse)
async def search(req: SearchRequest):
    if not state["ready"]:
        return JSONResponse(status_code=503, content={"results": [], "note": "RAG service is still loading."})

    t_start = time.time()
    query = req.query.strip()
    top_k = max(1, min(req.topK, 50))
    CANDIDATE_POOL = 30

    embeddings: np.ndarray = state["embeddings"]
    bm25: BM25Okapi = state["bm25"]
    chunk_ids: list[str] = state["chunk_ids"]
    chunk_metadata: dict = state["chunk_metadata"]
    chunk_text: dict = state["chunk_text"]

    # 1. Embed query with ONNX
    query_embedding = _embed([query])[0]

    # 2. Semantic search — brute-force cosine similarity (fast for 86K × 384)
    similarities = embeddings @ query_embedding  # (N,)
    top_sem_indices = np.argsort(similarities)[::-1][:CANDIDATE_POOL]
    sem_ids = [chunk_ids[i] for i in top_sem_indices]
    sem_distance_map: dict[str, float] = {
        chunk_ids[i]: float(1.0 - similarities[i]) for i in top_sem_indices
    }

    # 3. BM25 retrieval
    query_tokens = _tokenize(query)
    bm25_scores_arr = bm25.get_scores(query_tokens)
    top_bm25_indices = np.argsort(bm25_scores_arr)[::-1][:CANDIDATE_POOL]
    bm25_top_ids = [chunk_ids[i] for i in top_bm25_indices]
    bm25_score_map: dict[str, float] = {
        chunk_ids[i]: float(bm25_scores_arr[i]) for i in top_bm25_indices
    }

    # 4. Reciprocal Rank Fusion
    sem_rank = {cid: rank for rank, cid in enumerate(sem_ids)}
    bm25_rank = {cid: rank for rank, cid in enumerate(bm25_top_ids)}

    all_candidates = set(sem_ids) | set(bm25_top_ids)

    # Apply metadata filters post-fusion
    if req.jurisdictionFilter == "east_africa":
        all_candidates = {
            cid for cid in all_candidates
            if chunk_metadata.get(cid, {}).get("jurisdiction") == "east_africa"
        }
    if req.bindingOnly:
        all_candidates = {
            cid for cid in all_candidates
            if chunk_metadata.get(cid, {}).get("binding_in_kenya", True) is True
        }

    rrf_k = 60
    rrf_scores: dict[str, float] = {}
    for cid in all_candidates:
        score = 0.0
        if cid in sem_rank:
            score += 1.0 / (rrf_k + sem_rank[cid])
        if cid in bm25_rank:
            score += 1.0 / (rrf_k + bm25_rank[cid])
        rrf_scores[cid] = score

    fused_ranked = sorted(rrf_scores, key=lambda c: rrf_scores[c], reverse=True)[:top_k]

    if not fused_ranked:
        elapsed_ms = int((time.time() - t_start) * 1000)
        log.info("query=%r topK=%d results=0 ms=%d", query[:60], top_k, elapsed_ms)
        return SearchResponse(results=[], note="No matching authority in the Iroh corpus.")

    # 5. Build results
    results = [
        _normalize(
            chunk_id=cid,
            meta=chunk_metadata.get(cid, {}),
            text=chunk_text.get(cid, ""),
            semantic_distance=sem_distance_map.get(cid, 1.0),
            bm25_score=bm25_score_map.get(cid, 0.0),
            rrf_score=rrf_scores[cid],
        )
        for cid in fused_ranked
    ]

    elapsed_ms = int((time.time() - t_start) * 1000)
    log.info(
        "query=%r topK=%d sem=%d bm25=%d results=%d ms=%d",
        query[:60],
        top_k,
        len(sem_ids),
        len(bm25_top_ids),
        len(results),
        elapsed_ms,
    )

    return SearchResponse(results=results)


# ---------------------------------------------------------------------------
# Health endpoint
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    if not state["ready"]:
        return JSONResponse(status_code=503, content={"status": "loading"})
    return {
        "status": "ok",
        "chunks_indexed": state["chunks_indexed"],
        "models_loaded": True,
    }

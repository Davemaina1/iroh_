"""
Iroh RAG sidecar — ONNX embedding, BM25 hybrid retrieval, RRF fusion.
Connects to a running ChromaDB server.
Exposes POST /search and GET /health on port 8001.

Runs within 512MB RAM — uses onnxruntime instead of torch/sentence-transformers.
"""

import asyncio
import logging
import os
import pickle
import re
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

import chromadb
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

CHROMA_HOST = os.environ.get("CHROMA_HOST", "localhost")
CHROMA_PORT = int(os.environ.get("CHROMA_PORT", "8000"))
BM25_CACHE_PATH = os.path.join(os.path.dirname(__file__), ".bm25_cache.pkl")
MODEL_CACHE_DIR = os.path.join(os.path.dirname(__file__), ".model_cache")
EXPECTED_CHUNKS = 86_521
BATCH_SIZE = 1000

state: dict = {
    "ready": False,
    "ort_session": None,
    "tokenizer": None,
    "collection": None,
    "bm25": None,
    "bm25_chunk_ids": [],
    "chunk_metadata": {},
    "chunk_text": {},
    "chunks_indexed": 0,
}


# ---------------------------------------------------------------------------
# ONNX Embedding Model
# ---------------------------------------------------------------------------

EMBED_MODEL_REPO = "sentence-transformers/all-MiniLM-L6-v2"
EMBED_DIM = 384


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

    token_embeddings = outputs[0]  # (batch, seq_len, hidden_dim)
    mask_expanded = attention_mask[:, :, np.newaxis].astype(np.float32)
    sum_embeddings = np.sum(token_embeddings * mask_expanded, axis=1)
    sum_mask = np.sum(mask_expanded, axis=1).clip(min=1e-9)
    mean_pooled = sum_embeddings / sum_mask

    norms = np.linalg.norm(mean_pooled, axis=1, keepdims=True).clip(min=1e-9)
    return mean_pooled / norms


# ---------------------------------------------------------------------------
# Startup: load models + build BM25 index
# ---------------------------------------------------------------------------

def _pull_all_chunks(collection) -> tuple[list[str], list[str], list[dict]]:
    """Pull all chunks from ChromaDB in batches."""
    all_ids: list[str] = []
    all_texts: list[str] = []
    all_metas: list[dict] = []
    offset = 0
    while True:
        batch = collection.get(
            limit=BATCH_SIZE,
            offset=offset,
            include=["documents", "metadatas"],
        )
        ids = batch.get("ids", [])
        if not ids:
            break
        all_ids.extend(ids)
        all_texts.extend(batch.get("documents", [""] * len(ids)))
        all_metas.extend(batch.get("metadatas", [{}] * len(ids)))
        offset += len(ids)
        if offset // 10_000 > (offset - len(ids)) // 10_000:
            log.info("  … pulled %d chunks so far", offset)
    return all_ids, all_texts, all_metas


def _tokenize(text: str) -> list[str]:
    return re.findall(r"\w+", (text or "").lower())


def _startup():
    log.info("=== Iroh RAG sidecar starting (ONNX-lite mode) ===")

    # 1. Download and load ONNX embedding model
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

    # 2. Connect to ChromaDB
    log.info("Connecting to ChromaDB at %s:%d …", CHROMA_HOST, CHROMA_PORT)
    client = chromadb.HttpClient(host=CHROMA_HOST, port=CHROMA_PORT, ssl=False)
    collection = client.get_collection("kenya_law")
    state["collection"] = collection
    total = collection.count()
    log.info("  Collection 'kenya_law': %d chunks", total)
    if abs(total - EXPECTED_CHUNKS) > 10:
        log.warning(
            "  DISCREPANCY: expected ~%d chunks, got %d.",
            EXPECTED_CHUNKS,
            total,
        )

    # 3. BM25 index — load from cache or rebuild
    cache_ok = False
    if os.path.exists(BM25_CACHE_PATH):
        log.info("Found BM25 cache, validating …")
        try:
            with open(BM25_CACHE_PATH, "rb") as f:
                cached = pickle.load(f)
            if cached.get("chunk_count") == total:
                state["bm25"] = cached["bm25"]
                state["bm25_chunk_ids"] = cached["chunk_ids"]
                state["chunk_metadata"] = cached["chunk_metadata"]
                state["chunk_text"] = cached["chunk_text"]
                state["chunks_indexed"] = total
                cache_ok = True
                log.info("  BM25 cache valid (%d chunks).", total)
            else:
                log.info("  Cache stale. Rebuilding.")
        except Exception as e:
            log.warning("  Cache load failed (%s). Rebuilding.", e)

    if not cache_ok:
        log.info("Building BM25 index over %d chunks …", total)
        t0 = time.time()
        all_ids, all_texts, all_metas = _pull_all_chunks(collection)
        log.info("  Pulled %d chunks in %.1fs", len(all_ids), time.time() - t0)

        corpus_tokens = [_tokenize(t) for t in all_texts]
        log.info("  Tokenised corpus. Fitting BM25 …")
        t1 = time.time()
        bm25 = BM25Okapi(corpus_tokens)
        log.info("  BM25 fitted in %.1fs", time.time() - t1)

        chunk_metadata = {cid: (m or {}) for cid, m in zip(all_ids, all_metas)}
        chunk_text = {cid: (t or "") for cid, t in zip(all_ids, all_texts)}

        state["bm25"] = bm25
        state["bm25_chunk_ids"] = all_ids
        state["chunk_metadata"] = chunk_metadata
        state["chunk_text"] = chunk_text
        state["chunks_indexed"] = len(all_ids)

        log.info("  Saving BM25 cache …")
        with open(BM25_CACHE_PATH, "wb") as f:
            pickle.dump(
                {
                    "chunk_count": len(all_ids),
                    "bm25": bm25,
                    "chunk_ids": all_ids,
                    "chunk_metadata": chunk_metadata,
                    "chunk_text": chunk_text,
                },
                f,
            )
        log.info("  BM25 cache saved.")

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


def _build_where(jurisdiction_filter: Optional[str], binding_only: bool) -> Optional[dict]:
    clauses = []
    if jurisdiction_filter == "east_africa":
        clauses.append({"jurisdiction": {"$eq": "east_africa"}})
    if binding_only:
        clauses.append({"binding_in_kenya": {"$eq": True}})
    if not clauses:
        return None
    if len(clauses) == 1:
        return clauses[0]
    return {"$and": clauses}


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

    collection = state["collection"]
    bm25: BM25Okapi = state["bm25"]
    bm25_chunk_ids: list[str] = state["bm25_chunk_ids"]
    chunk_metadata: dict = state["chunk_metadata"]
    chunk_text: dict = state["chunk_text"]

    # 1. Embed query with ONNX
    query_embedding = _embed([query])[0].tolist()

    # 2. Semantic retrieval via ChromaDB
    where = _build_where(req.jurisdictionFilter, req.bindingOnly)
    query_kwargs: dict = {
        "query_embeddings": [query_embedding],
        "n_results": CANDIDATE_POOL,
        "include": ["distances"],
    }
    if where:
        query_kwargs["where"] = where

    semantic_results = collection.query(**query_kwargs)
    sem_ids = semantic_results.get("ids", [[]])[0]
    sem_distances = semantic_results.get("distances", [[]])[0]
    sem_distance_map: dict[str, float] = dict(zip(sem_ids, sem_distances))

    # 3. BM25 retrieval
    query_tokens = _tokenize(query)
    bm25_scores_arr = bm25.get_scores(query_tokens)
    top_bm25_indices = np.argsort(bm25_scores_arr)[::-1][:CANDIDATE_POOL]
    bm25_score_map: dict[str, float] = {
        bm25_chunk_ids[i]: float(bm25_scores_arr[i]) for i in top_bm25_indices
    }

    # 4. Reciprocal Rank Fusion
    sem_rank = {cid: rank for rank, cid in enumerate(sem_ids)}
    bm25_top_ids = [bm25_chunk_ids[i] for i in top_bm25_indices]
    bm25_rank = {cid: rank for rank, cid in enumerate(bm25_top_ids)}

    all_candidates = set(sem_ids) | set(bm25_top_ids)
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
        log.info(
            "query=%r topK=%d sem=%d bm25=%d fused=0 ms=%d",
            query[:60], top_k, len(sem_ids), len(bm25_top_ids), int((time.time() - t_start) * 1000),
        )
        return SearchResponse(results=[], note="No matching authority in the Iroh corpus.")

    # 5. Build results (no reranker — RRF score used directly)
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

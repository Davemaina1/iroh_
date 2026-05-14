"""
Iroh RAG sidecar — ONNX embedding + semantic search.
Loads corpus from Supabase Storage, memory-maps embeddings, reads metadata on demand.
Exposes POST /search and GET /health.

Peak memory: ~320MB (fits in Render's 512MB free tier).
"""

import asyncio
import json
import logging
import os
import re
import tempfile
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
# Config
# ---------------------------------------------------------------------------

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://dslxzchimexwdyvsyiqc.supabase.co")
STORAGE_BASE = f"{SUPABASE_URL}/storage/v1/object/public/rag-corpus"
MODEL_CACHE_DIR = os.environ.get("MODEL_CACHE_DIR", "/tmp/rag_model_cache")
CORPUS_DIR = os.environ.get("CORPUS_DIR", "/tmp/rag_corpus")

state: dict = {
    "ready": False,
    "ort_session": None,
    "tokenizer": None,
    "embeddings": None,  # mmap'd numpy array (N, 384) float16
    "offsets": None,     # byte offsets into metadata JSONL
    "meta_path": None,   # path to local metadata JSONL file
    "num_chunks": 0,
}


# ---------------------------------------------------------------------------
# ONNX Embedding
# ---------------------------------------------------------------------------

def _download_model():
    os.makedirs(MODEL_CACHE_DIR, exist_ok=True)
    log.info("Downloading ONNX model …")
    model_path = hf_hub_download(
        repo_id="sentence-transformers/all-MiniLM-L6-v2",
        filename="onnx/model.onnx",
        cache_dir=MODEL_CACHE_DIR,
    )
    tokenizer_path = hf_hub_download(
        repo_id="sentence-transformers/all-MiniLM-L6-v2",
        filename="tokenizer.json",
        cache_dir=MODEL_CACHE_DIR,
    )
    return model_path, tokenizer_path


def _embed(texts: list[str]) -> np.ndarray:
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

    outputs = session.run(None, {
        "input_ids": input_ids,
        "attention_mask": attention_mask,
        "token_type_ids": token_type_ids,
    })

    token_embeddings = outputs[0]
    mask_expanded = attention_mask[:, :, np.newaxis].astype(np.float32)
    sum_embeddings = np.sum(token_embeddings * mask_expanded, axis=1)
    sum_mask = np.sum(mask_expanded, axis=1).clip(min=1e-9)
    mean_pooled = sum_embeddings / sum_mask
    norms = np.linalg.norm(mean_pooled, axis=1, keepdims=True).clip(min=1e-9)
    return (mean_pooled / norms).astype(np.float16)


# ---------------------------------------------------------------------------
# Corpus download
# ---------------------------------------------------------------------------

def _download_file(url: str, dest: str):
    """Stream a file from URL to disk without holding it all in memory."""
    log.info("  Downloading %s …", url.split("/")[-1])
    with httpx.Client(timeout=180.0) as client:
        with client.stream("GET", url) as resp:
            resp.raise_for_status()
            with open(dest, "wb") as f:
                for chunk in resp.iter_bytes(chunk_size=65536):
                    f.write(chunk)
    size_mb = os.path.getsize(dest) / 1024 / 1024
    log.info("    Saved %.1f MB to %s", size_mb, dest)


def _download_corpus():
    """Download corpus files to local disk for memory-mapping."""
    os.makedirs(CORPUS_DIR, exist_ok=True)

    emb_p1_path = os.path.join(CORPUS_DIR, "emb_p1.npy")
    emb_p2_path = os.path.join(CORPUS_DIR, "emb_p2.npy")
    meta_p1_path = os.path.join(CORPUS_DIR, "meta_p1.jsonl")
    meta_p2_path = os.path.join(CORPUS_DIR, "meta_p2.jsonl")
    offsets_path = os.path.join(CORPUS_DIR, "offsets.npy")
    meta_path = os.path.join(CORPUS_DIR, "corpus_meta.jsonl")
    emb_path = os.path.join(CORPUS_DIR, "corpus_embeddings.npy")

    # Download all parts
    t0 = time.time()
    _download_file(f"{STORAGE_BASE}/corpus_emb_p1.npy", emb_p1_path)
    _download_file(f"{STORAGE_BASE}/corpus_emb_p2.npy", emb_p2_path)
    _download_file(f"{STORAGE_BASE}/corpus_meta_part1.jsonl", meta_p1_path)
    _download_file(f"{STORAGE_BASE}/corpus_meta_part2.jsonl", meta_p2_path)
    _download_file(f"{STORAGE_BASE}/corpus_offsets.npy", offsets_path)
    log.info("  All files downloaded in %.1fs", time.time() - t0)

    # Concatenate embedding parts into single .npy for mmap
    log.info("  Assembling embeddings …")
    emb1 = np.load(emb_p1_path)
    emb2 = np.load(emb_p2_path)
    combined = np.concatenate([emb1, emb2], axis=0)
    np.save(emb_path, combined)
    del emb1, emb2, combined
    os.remove(emb_p1_path)
    os.remove(emb_p2_path)

    # Concatenate metadata parts
    log.info("  Assembling metadata …")
    with open(meta_path, "wb") as out:
        for part in [meta_p1_path, meta_p2_path]:
            with open(part, "rb") as inp:
                while True:
                    chunk = inp.read(65536)
                    if not chunk:
                        break
                    out.write(chunk)
            os.remove(part)

    # Rebuild offsets for the concatenated metadata file
    log.info("  Building line offsets …")
    offsets = []
    with open(meta_path, "rb") as f:
        while True:
            pos = f.tell()
            line = f.readline()
            if not line:
                break
            offsets.append(pos)
    offsets_arr = np.array(offsets, dtype=np.int64)
    np.save(offsets_path, offsets_arr)

    return emb_path, meta_path, offsets_path


# ---------------------------------------------------------------------------
# Startup
# ---------------------------------------------------------------------------

def _startup():
    log.info("=== Iroh RAG sidecar starting ===")

    # 1. Load ONNX model
    t0 = time.time()
    model_path, tokenizer_path = _download_model()
    log.info("  Model ready in %.1fs", time.time() - t0)

    opts = ort.SessionOptions()
    opts.inter_op_num_threads = 1
    opts.intra_op_num_threads = 2
    opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    state["ort_session"] = ort.InferenceSession(
        model_path, sess_options=opts, providers=["CPUExecutionProvider"]
    )
    state["tokenizer"] = Tokenizer.from_file(tokenizer_path)
    state["tokenizer"].enable_truncation(max_length=256)
    state["tokenizer"].enable_padding(length=None)
    log.info("  ONNX session loaded.")

    # 2. Download corpus
    log.info("Downloading corpus from Supabase Storage …")
    emb_path, meta_path, offsets_path = _download_corpus()

    # 3. Memory-map embeddings (no RAM cost)
    state["embeddings"] = np.load(emb_path, mmap_mode="r")
    state["offsets"] = np.load(offsets_path)
    state["meta_path"] = meta_path
    state["num_chunks"] = len(state["offsets"])
    log.info("  Corpus loaded: %d chunks, embeddings mmap'd.", state["num_chunks"])

    state["ready"] = True
    log.info("=== RAG sidecar ready. %d chunks indexed. ===", state["num_chunks"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    await asyncio.to_thread(_startup)
    yield


app = FastAPI(title="Iroh RAG Service", lifespan=lifespan)


# ---------------------------------------------------------------------------
# Models
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
# Metadata reader
# ---------------------------------------------------------------------------

def _read_meta(indices: list[int]) -> list[dict]:
    """Read metadata records for specific row indices from the JSONL file."""
    offsets = state["offsets"]
    results = []
    with open(state["meta_path"], "rb") as f:
        for idx in indices:
            f.seek(int(offsets[idx]))
            line = f.readline()
            results.append(json.loads(line))
    return results


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

    embeddings = state["embeddings"]

    # 1. Embed query
    q_emb = _embed([query])[0]

    # 2. Cosine similarity (brute-force, ~170ms for 86K × 384 float16)
    similarities = embeddings @ q_emb

    # 3. Get top candidates (fetch extra for filtering)
    fetch_n = min(top_k * 4, 200)
    top_indices = np.argsort(similarities)[::-1][:fetch_n].tolist()

    # 4. Read metadata for candidates
    metas = _read_meta(top_indices)

    # 5. Filter and build results
    results: list[ChunkResult] = []
    for idx, meta in zip(top_indices, metas):
        if req.jurisdictionFilter == "east_africa" and meta.get("jurisdiction") != "east_africa":
            continue
        if req.bindingOnly and meta.get("binding_in_kenya") is not True:
            continue

        sim = float(similarities[idx])
        results.append(ChunkResult(
            chunk_id=meta["chunk_id"],
            title=meta.get("title") or "Untitled",
            url=meta.get("url") or None,
            source_archive=meta.get("source_archive") or "Kenya Law (Primary)",
            type=meta.get("type") or "case_law",
            court=meta.get("court") or None,
            year=meta.get("year") or None,
            jurisdiction=meta.get("jurisdiction") or "kenya",
            binding_in_kenya=meta.get("binding_in_kenya", True),
            citation=meta.get("citation") or None,
            snippet=meta.get("snippet", ""),
            semantic_distance=round(1.0 - sim, 4),
            bm25_score=0.0,
            rerank_score=round(sim, 4),
        ))

        if len(results) >= top_k:
            break

    elapsed_ms = int((time.time() - t_start) * 1000)
    log.info("query=%r topK=%d results=%d ms=%d", query[:60], top_k, len(results), elapsed_ms)

    if not results:
        return SearchResponse(results=[], note="No matching authority in the Iroh corpus.")
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
        "chunks_indexed": state["num_chunks"],
        "models_loaded": True,
    }

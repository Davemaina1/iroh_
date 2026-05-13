"""
Iroh RAG sidecar — embedding, BM25 hybrid retrieval, bge-reranker re-ranking.
Connects to a running ChromaDB server (localhost:8000).
Exposes POST /search and GET /health on port 8001.
"""

import asyncio
import logging
import os
import pickle
import re
import time
from contextlib import asynccontextmanager
from typing import Optional

import chromadb
import numpy as np
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from rank_bm25 import BM25Okapi
from sentence_transformers import CrossEncoder, SentenceTransformer

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
EXPECTED_CHUNKS = 86_521
BATCH_SIZE = 1000

state: dict = {
    "ready": False,
    "embed_model": None,
    "reranker": None,
    "collection": None,
    "bm25": None,
    "bm25_chunk_ids": [],   # parallel array: position → chunk_id
    "chunk_metadata": {},   # chunk_id → metadata dict
    "chunk_text": {},       # chunk_id → full document text
    "chunks_indexed": 0,
}


# ---------------------------------------------------------------------------
# Startup: load models + build BM25 index
# ---------------------------------------------------------------------------

def _pull_all_chunks(collection) -> tuple[list[str], list[str], list[dict]]:
    """Pull all chunks from ChromaDB in batches. Returns (ids, texts, metadatas)."""
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
    log.info("=== Iroh RAG sidecar starting ===")

    # 1. Load embedding model
    log.info("Loading sentence-transformers/all-MiniLM-L6-v2 …")
    t0 = time.time()
    state["embed_model"] = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2", device="cpu")
    log.info("  Embedding model loaded in %.1fs", time.time() - t0)

    # 2. Load re-ranker
    log.info("Loading BAAI/bge-reranker-base …")
    t0 = time.time()
    state["reranker"] = CrossEncoder("BAAI/bge-reranker-base", device="cpu")
    log.info("  Re-ranker loaded in %.1fs", time.time() - t0)

    # 3. Connect to ChromaDB
    log.info("Connecting to ChromaDB at %s:%d …", CHROMA_HOST, CHROMA_PORT)
    client = chromadb.HttpClient(host=CHROMA_HOST, port=CHROMA_PORT, ssl=False)
    collection = client.get_collection("kenya_law")
    state["collection"] = collection
    total = collection.count()
    log.info("  Collection 'kenya_law': %d chunks", total)
    if abs(total - EXPECTED_CHUNKS) > 10:
        log.warning(
            "  DISCREPANCY: expected ~%d chunks, got %d. Retrieval may be incomplete.",
            EXPECTED_CHUNKS,
            total,
        )

    # 4. BM25 index — load from cache or rebuild
    cache_ok = False
    if os.path.exists(BM25_CACHE_PATH):
        log.info("Found BM25 cache at %s, validating …", BM25_CACHE_PATH)
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
                log.info("  BM25 cache valid (%d chunks). Skipping rebuild.", total)
            else:
                log.info(
                    "  Cache chunk count %d != current %d. Rebuilding.",
                    cached.get("chunk_count"),
                    total,
                )
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

        log.info("  Saving BM25 cache to %s …", BM25_CACHE_PATH)
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
    # Run blocking startup (model loads + BM25 build) in a worker thread so the
    # event loop is free, but await its completion before yielding so the server
    # only starts accepting traffic once /search is actually usable.
    # /health remains queryable during startup because uvicorn serves it
    # after the lifespan startup completes anyway; clients hitting the port
    # before that get a connection-level wait, which is the correct behavior.
    await asyncio.to_thread(_startup)
    yield
    # Shutdown: nothing to clean up — models are GC'd, ChromaDB client closes
    # itself, BM25 cache is already persisted.


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
    rerank_score: float,
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
        rerank_score=rerank_score,
    )


def _build_where(jurisdiction_filter: Optional[str], binding_only: bool) -> Optional[dict]:
    clauses = []
    if jurisdiction_filter == "east_africa":
        clauses.append({"jurisdiction": {"$eq": "east_africa"}})
    # "kenya" → no clause (many corpus chunks lack the jurisdiction field)
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

    embed_model: SentenceTransformer = state["embed_model"]
    reranker: CrossEncoder = state["reranker"]
    collection = state["collection"]
    bm25: BM25Okapi = state["bm25"]
    bm25_chunk_ids: list[str] = state["bm25_chunk_ids"]
    chunk_metadata: dict = state["chunk_metadata"]
    chunk_text: dict = state["chunk_text"]

    # 1. Embed query
    query_embedding = embed_model.encode(query, normalize_embeddings=True).tolist()

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

    fused_candidates = sorted(rrf_scores, key=lambda c: rrf_scores[c], reverse=True)[:CANDIDATE_POOL]

    if not fused_candidates:
        log.info(
            "query=%r topK=%d sem=%d bm25=%d fused=0 reranked=0 ms=%d",
            query[:60], top_k, len(sem_ids), len(bm25_top_ids), int((time.time() - t_start) * 1000),
        )
        return SearchResponse(results=[], note="No matching authority in the Iroh corpus.")

    # 5. Re-rank
    pairs = [(query, chunk_text.get(cid, "")) for cid in fused_candidates]
    rerank_scores_arr = reranker.predict(pairs)
    reranked = sorted(
        zip(fused_candidates, rerank_scores_arr),
        key=lambda x: x[1],
        reverse=True,
    )

    # 6. Take topK
    final = reranked[:top_k]

    # 7. Normalize
    results = [
        _normalize(
            chunk_id=cid,
            meta=chunk_metadata.get(cid, {}),
            text=chunk_text.get(cid, ""),
            semantic_distance=sem_distance_map.get(cid, 1.0),
            bm25_score=bm25_score_map.get(cid, 0.0),
            rerank_score=float(score),
        )
        for cid, score in final
    ]

    # 8. No quality note — the model decides whether results are sufficient from
    # the rerank_score field on each result. Threshold-based hints over cross-encoder
    # logits are unreliable across query types.
    note: Optional[str] = None

    elapsed_ms = int((time.time() - t_start) * 1000)
    log.info(
        "query=%r topK=%d sem=%d bm25=%d fused=%d reranked=%d ms=%d",
        query[:60],
        top_k,
        len(sem_ids),
        len(bm25_top_ids),
        len(fused_candidates),
        len(results),
        elapsed_ms,
    )

    return SearchResponse(results=results, note=note)


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

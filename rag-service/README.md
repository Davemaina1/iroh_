# Iroh RAG Service

Python FastAPI sidecar — ONNX embedding + BM25 hybrid retrieval with RRF fusion over the Kenya Law corpus. Runs within 512MB RAM (no torch/sentence-transformers).

## Prerequisites

- Python 3.11 at `/opt/homebrew/bin/python3.11`
- ChromaDB server running at `localhost:8000` (`chroma run --path /path/to/chroma-dump`)

## One-time setup

```bash
cd rag-service
./setup.sh
```

This creates a `.venv`, installs all pinned dependencies, and verifies the install.

## Start

```bash
cd rag-service
./run.sh
```

On first run, the service pulls all 86,521 chunks from ChromaDB, builds a BM25 index (~10-20s), and saves a cache to `.bm25_cache.pkl`. Subsequent starts load from the cache in ~2s.

## Health check

```bash
curl -s http://localhost:8001/health
```

Returns `{"status":"ok","chunks_indexed":86521,"models_loaded":true}` when ready, or `{"status":"loading"}` (HTTP 503) during startup.

## Stop

`Ctrl+C`

## Dependencies

- ChromaDB server **must** be running at `localhost:8000` before starting this service.
- The Node backend connects to this service at `http://localhost:8001` (configure via `RAG_SERVICE_URL` env var).

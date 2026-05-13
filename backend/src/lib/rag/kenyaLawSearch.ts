// ---------------------------------------------------------------------------
// Kenya Law search — HTTP client to the Iroh RAG sidecar (rag-service/).
// All embedding, BM25, and re-ranking runs in the Python sidecar on port 8001.
// This file has zero ML/vector-DB dependencies.
// ---------------------------------------------------------------------------

const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL ?? "http://localhost:8001";
const TIMEOUT_MS = 10_000;

// ---------------------------------------------------------------------------
// Types — must match the Python ChunkResult schema in rag-service/app.py
// ---------------------------------------------------------------------------

export interface NormalizedResult {
    chunk_id: string;
    title: string;
    url: string | null;
    source_archive: string;
    type: string;
    court: string | null;
    year: string | null;
    jurisdiction: string;
    binding_in_kenya: boolean;
    citation: string | null;
    snippet: string;
    semantic_distance: number;
    bm25_score: number;
    rerank_score: number;
}

export interface KenyaLawSearchOpts {
    topK?: number;
    jurisdictionFilter?: "kenya" | "east_africa";
    bindingOnly?: boolean;
}

export interface KenyaLawSearchResult {
    results: NormalizedResult[];
    note?: string;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function searchKenyaLaw(
    query: string,
    opts: KenyaLawSearchOpts = {},
): Promise<KenyaLawSearchResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const response = await fetch(`${RAG_SERVICE_URL}/search`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                query,
                topK: opts.topK ?? 8,
                jurisdictionFilter: opts.jurisdictionFilter ?? null,
                bindingOnly: opts.bindingOnly ?? false,
            }),
            signal: controller.signal,
        });

        if (!response.ok) {
            return {
                results: [],
                note: `RAG service error: HTTP ${response.status}`,
            };
        }

        const data = await response.json() as KenyaLawSearchResult;
        return data;

    } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
            return { results: [], note: "RAG service timed out." };
        }
        const message = err instanceof Error ? err.message : String(err);
        return { results: [], note: `RAG service unreachable: ${message}` };
    } finally {
        clearTimeout(timer);
    }
}

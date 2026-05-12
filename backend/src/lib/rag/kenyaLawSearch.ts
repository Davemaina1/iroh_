import { ChromaClient, Collection } from "chromadb";

// ---------------------------------------------------------------------------
// Embedder — lazy-cached, module-level singleton
// ---------------------------------------------------------------------------

type EmbedderPipeline = {
    (input: string | string[], opts?: Record<string, unknown>): Promise<{ data: Float32Array | Float32Array[] }>;
};

let embedderPromise: Promise<EmbedderPipeline> | null = null;

function getEmbedder(): Promise<EmbedderPipeline> {
    if (!embedderPromise) {
        embedderPromise = (async () => {
            const { pipeline } = await import("@xenova/transformers");
            return pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2") as Promise<EmbedderPipeline>;
        })();
    }
    return embedderPromise;
}

async function embed(text: string): Promise<number[]> {
    const extractor = await getEmbedder();
    const output = await extractor(text, { pooling: "mean", normalize: true });
    const arr = Array.isArray(output.data) ? (output.data[0] as Float32Array) : (output.data as Float32Array);
    return Array.from(arr);
}

// ---------------------------------------------------------------------------
// ChromaDB client — lazy-cached
// ---------------------------------------------------------------------------

let chromaPromise: Promise<ChromaClient> | null = null;

function getChroma(): Promise<ChromaClient> {
    if (!chromaPromise) {
        chromaPromise = (async () => {
            const host = process.env.CHROMA_HOST ?? "localhost";
            const port = parseInt(process.env.CHROMA_PORT ?? "8000", 10);
            const ssl = process.env.CHROMA_SSL === "true";
            const { ChromaClient } = await import("chromadb");
            return new ChromaClient({ host, port, ssl });
        })();
    }
    return chromaPromise;
}

let collectionPromise: Promise<Collection> | null = null;

function getCollection(): Promise<Collection> {
    if (!collectionPromise) {
        collectionPromise = (async () => {
            const chroma = await getChroma();
            return chroma.getOrCreateCollection({ name: "kenya_law" });
        })();
    }
    return collectionPromise;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NormalizedResult {
    id: string;
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
    distance: number;
}

export interface KenyaLawSearchOpts {
    topK?: number;
    jurisdictionFilter?: "kenya" | "east_africa";
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
    const topK = opts.topK ?? 8;

    let queryEmbedding: number[];
    try {
        queryEmbedding = await embed(query);
    } catch (e) {
        return { results: [], note: `Embedding failed: ${String(e)}` };
    }

    let collection: Collection;
    try {
        collection = await getCollection();
    } catch (e) {
        return { results: [], note: `ChromaDB unavailable: ${String(e)}` };
    }

    // Only apply a where filter for east_africa; for "kenya" trust the
    // corpus is already Kenyan-centric (many chunks predate the jurisdiction
    // metadata field and would be silently excluded by a where clause).
    const whereClause =
        opts.jurisdictionFilter === "east_africa"
            ? { jurisdiction: { $eq: "east_africa" } }
            : undefined;

    let raw: Awaited<ReturnType<Collection["query"]>>;
    try {
        raw = await collection.query({
            queryEmbeddings: [queryEmbedding],
            nResults: topK,
            ...(whereClause ? { where: whereClause } : {}),
        });
    } catch (e) {
        return { results: [], note: `ChromaDB query failed: ${String(e)}` };
    }

    const ids = raw.ids?.[0] ?? [];
    const docs = raw.documents?.[0] ?? [];
    const metas = raw.metadatas?.[0] ?? [];
    const distances = raw.distances?.[0] ?? [];

    if (ids.length === 0) {
        return {
            results: [],
            note: "No results found in the Kenya Law corpus for this query.",
        };
    }

    const results: NormalizedResult[] = ids.map((id, i) => {
        const fullText = docs[i] ?? "";
        const meta = (metas[i] ?? {}) as Record<string, unknown>;
        const distance = distances[i] ?? 1;

        const str = (k: string): string | null => {
            const v = meta[k];
            return typeof v === "string" && v.trim() !== "" ? v : null;
        };
        const yearStr = (): string | null => {
            const y = str("year");
            if (y) return y;
            const d = str("date");
            if (d) {
                const m = d.match(/\b(19|20)\d{2}\b/);
                if (m) return m[0];
            }
            return null;
        };

        return {
            id: String(id),
            title: str("title") ?? "Untitled",
            url: str("url"),
            source_archive: str("source_archive") ?? "Kenya Law (Primary)",
            type: str("type") ?? "case_law",
            court: str("court"),
            year: yearStr(),
            jurisdiction: str("jurisdiction") ?? "kenya",
            binding_in_kenya: typeof meta.binding_in_kenya === "boolean" ? meta.binding_in_kenya : true,
            citation: str("citation"),
            snippet: fullText.slice(0, 400) + (fullText.length > 400 ? "..." : ""),
            distance,
        };
    });

    const weakNote =
        results.length > 0 && results.every((r) => r.distance > 0.6)
            ? "All results have low similarity (distance > 0.6) — the corpus may not contain directly relevant material for this query."
            : undefined;

    return { results, note: weakNote };
}

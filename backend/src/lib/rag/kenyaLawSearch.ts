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
            const dbPath = process.env.CHROMA_DB_PATH;
            if (!dbPath) throw new Error("[kenyaLawSearch] CHROMA_DB_PATH env var is not set");
            const { ChromaClient } = await import("chromadb");
            return new ChromaClient({ path: dbPath });
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
    text: string;
    source?: string;
    jurisdiction?: string;
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
        return {
            id: String(id),
            text: fullText.slice(0, 400),
            source: typeof meta.source === "string" ? meta.source : undefined,
            jurisdiction: typeof meta.jurisdiction === "string" ? meta.jurisdiction : undefined,
            distance,
        };
    });

    const weakNote =
        results.length > 0 && results.every((r) => r.distance > 0.6)
            ? "All results have low similarity (distance > 0.6) — the corpus may not contain directly relevant material for this query."
            : undefined;

    return { results, note: weakNote };
}

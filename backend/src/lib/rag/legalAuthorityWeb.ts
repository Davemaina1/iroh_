// ---------------------------------------------------------------------------
// Trusted domain allowlist for Kenyan and East African legal authorities.
// Add new domains here as authoritative sources are identified.
// ---------------------------------------------------------------------------

export const TRUSTED_LEGAL_DOMAINS: string[] = [
    "kenyalaw.org",           // Kenya Law Reports — statutes, cases, gazettes
    "parliament.go.ke",       // National Assembly & Senate bills, Hansard
    "kra.go.ke",              // Kenya Revenue Authority — tax law
    "odpp.go.ke",             // Director of Public Prosecutions
    "judiciary.go.ke",        // Judiciary of Kenya — rules, practice directions
    "competition.go.ke",      // Competition Authority of Kenya
    "cma.or.ke",              // Capital Markets Authority
    "centralbank.go.ke",      // Central Bank of Kenya — banking circulars
    "rlck.or.ke",             // Law Society of Kenya (formerly LSK)
    "lsk.or.ke",              // Law Society of Kenya alternate domain
    "eaclj.org",              // East African Court of Justice Law Journal
    "commonlii.org",          // Commonwealth Legal Information Institute
    // Future: comesa.int, eacj.org, afchpr.org, uncitral.org
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WebResult {
    url: string;
    title: string;
    content: string;
    score?: number;
}

export interface LegalAuthorityWebOpts {
    maxResults?: number;
    includeDomains?: string[];
}

export interface LegalAuthorityWebResult {
    results: WebResult[];
    note?: string;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function searchLegalAuthorityWeb(
    query: string,
    opts: LegalAuthorityWebOpts = {},
): Promise<LegalAuthorityWebResult> {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
        return {
            results: [],
            note: "Web search is unavailable: TAVILY_API_KEY is not configured.",
        };
    }

    const includeDomains = opts.includeDomains ?? TRUSTED_LEGAL_DOMAINS;
    const maxResults = opts.maxResults ?? 5;

    let response: Response;
    try {
        response = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                query,
                max_results: maxResults,
                include_domains: includeDomains,
                search_depth: "advanced",
            }),
        });
    } catch (e) {
        return {
            results: [],
            note: `Web search request failed: ${String(e)}`,
        };
    }

    if (!response.ok) {
        const body = await response.text().catch(() => "");
        return {
            results: [],
            note: `Tavily returned HTTP ${response.status}: ${body.slice(0, 200)}`,
        };
    }

    let json: unknown;
    try {
        json = await response.json();
    } catch (e) {
        return {
            results: [],
            note: `Failed to parse Tavily response: ${String(e)}`,
        };
    }

    const raw = json as { results?: unknown[] };
    if (!Array.isArray(raw.results) || raw.results.length === 0) {
        return {
            results: [],
            note: "No results returned from trusted legal authority sources for this query.",
        };
    }

    const results: WebResult[] = (raw.results as Record<string, unknown>[]).map((r) => ({
        url: typeof r.url === "string" ? r.url : "",
        title: typeof r.title === "string" ? r.title : "",
        content: typeof r.content === "string" ? r.content : "",
        score: typeof r.score === "number" ? r.score : undefined,
    }));

    return { results };
}

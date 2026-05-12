// ---------------------------------------------------------------------------
// Trusted domain allowlist for Kenyan and East African legal authorities.
// Add new domains here as authoritative sources are identified.
// ---------------------------------------------------------------------------

export const TRUSTED_LEGAL_DOMAINS: string[] = [
    // ---- Tier 1: Primary legal authority (must-have) ----
    "kenyalaw.org",           // Kenya Law — statutes, all court judgments, gazettes, Legal Notices, subsidiary legislation
    "new.kenyalaw.org",       // Kenya Law's newer portal (akoma ntoso URLs)
    "parliament.go.ke",       // Bills, Hansard, Acts of Parliament, committee reports
    "judiciary.go.ke",        // Judiciary — practice directions, cause lists, court rules

    // ---- Tier 2: Major regulators with binding rules and published decisions ----
    "centralbank.go.ke",      // CBK — prudential guidelines, banking circulars, FX regulations
    "odpc.go.ke",             // Office of the Data Protection Commissioner — decisions, guidance notes
    "kra.go.ke",              // Kenya Revenue Authority — tax rulings, public notices, procedures
    "tat.go.ke",              // Tax Appeals Tribunal — tax case decisions (major source of tax law)
    "cma.or.ke",              // Capital Markets Authority — listing rules, public offer regulations
    "cak.go.ke",              // Competition Authority of Kenya — merger decisions, anti-trust enforcement
    "ira.go.ke",              // Insurance Regulatory Authority — insurance circulars and guidelines
    "ca.go.ke",               // Communications Authority of Kenya — telecoms, ICT regulations
    "rba.go.ke",              // Retirement Benefits Authority — pensions
    "ppra.go.ke",             // Public Procurement Regulatory Authority + PPARB decisions
    "nema.go.ke",             // National Environment Management Authority — EIA, environmental regulations

    // ---- Tier 3: Specialist regulators and oversight bodies ----
    "odpp.go.ke",             // Office of the Director of Public Prosecutions
    "lsk.or.ke",              // Law Society of Kenya — journal, position papers, practice guidance
    "knchr.org",              // Kenya National Commission on Human Rights — reports, advisories
    "eacc.go.ke",             // Ethics and Anti-Corruption Commission
    "iebc.or.ke",             // Independent Electoral and Boundaries Commission
    "landcommission.go.ke",   // National Land Commission
    "kipi.go.ke",             // Kenya Industrial Property Institute — trademarks, patents
    "copyright.go.ke",        // Kenya Copyright Board
    "treasury.go.ke",         // National Treasury — Finance Bills, circulars
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

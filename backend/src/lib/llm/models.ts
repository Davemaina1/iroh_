import type { Provider } from "./types";

// ---------------------------------------------------------------------------
// Iroh mode → model mapping
// ---------------------------------------------------------------------------
export const QUICK_MODEL = "claude-haiku-4-5-20251001"; // fast, lightweight
export const DEEP_MODEL = "claude-opus-4-7";            // most capable
export const DRAFT_MODEL = "claude-opus-4-7";           // same as deep, different system prompt

export type ChatMode = "quick" | "deep" | "draft";

export function modeToModel(mode: string | undefined): string {
    if (mode === "deep" || mode === "draft") return DEEP_MODEL;
    return QUICK_MODEL; // "quick" or any unknown value → Haiku
}

// ---------------------------------------------------------------------------
// Canonical model IDs
// ---------------------------------------------------------------------------
// Main-chat tier (top-end) — user picks one of these per message.
export const CLAUDE_MAIN_MODELS = ["claude-opus-4-7", "claude-sonnet-4-6"] as const;
export const GEMINI_MAIN_MODELS = [
    "gemini-3.1-pro-preview",
    "gemini-3-flash-preview",
] as const;

// Mid-tier (used for tabular review) — user picks one in account settings.
export const CLAUDE_MID_MODELS = ["claude-sonnet-4-6"] as const;
export const GEMINI_MID_MODELS = ["gemini-3-flash-preview"] as const;

// Low-tier (used for title generation, lightweight extractions) — user picks
// one in account settings.
export const CLAUDE_LOW_MODELS = ["claude-haiku-4-5", "claude-haiku-4-5-20251001"] as const;
export const GEMINI_LOW_MODELS = ["gemini-3.1-flash-lite-preview"] as const;

export const DEFAULT_MAIN_MODEL = QUICK_MODEL;
export const DEFAULT_TITLE_MODEL = QUICK_MODEL;
export const DEFAULT_TABULAR_MODEL = "claude-sonnet-4-6";

const ALL_MODELS = new Set<string>([
    ...CLAUDE_MAIN_MODELS,
    ...GEMINI_MAIN_MODELS,
    ...CLAUDE_MID_MODELS,
    ...GEMINI_MID_MODELS,
    ...CLAUDE_LOW_MODELS,
    ...GEMINI_LOW_MODELS,
    QUICK_MODEL,
    DEEP_MODEL,
]);

// ---------------------------------------------------------------------------
// Provider inference
// ---------------------------------------------------------------------------

export function providerForModel(model: string): Provider {
    if (model.startsWith("claude")) return "claude";
    if (model.startsWith("gemini")) return "gemini";
    throw new Error(`Unknown model id: ${model}`);
}

export function resolveModel(id: string | null | undefined, fallback: string): string {
    if (id && ALL_MODELS.has(id)) return id;
    return fallback;
}

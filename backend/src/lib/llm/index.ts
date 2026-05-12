import { streamClaude, completeClaudeText } from "./claude";
import { QUICK_MODEL } from "./models";
import type { StreamChatParams, StreamChatResult, UserApiKeys } from "./types";

export * from "./types";
export * from "./models";

// Always route to Claude; normalize any non-Claude model ID to QUICK_MODEL.
// User-provided API keys are bypassed — claude.ts falls back to
// process.env.ANTHROPIC_API_KEY when apiKeys.claude is null/empty.
function toClaudeParams(params: StreamChatParams): StreamChatParams {
    let model = params.model;
    if (!model.startsWith("claude")) {
        console.warn("[Iroh] toClaudeParams: non-Claude model requested, coercing to QUICK_MODEL:", model);
        model = QUICK_MODEL;
    }
    return { ...params, model, apiKeys: { claude: null } };
}

export async function streamChatWithTools(
    params: StreamChatParams,
): Promise<StreamChatResult> {
    return streamClaude(toClaudeParams(params));
}

export async function completeText(params: {
    model: string;
    systemPrompt?: string;
    user: string;
    maxTokens?: number;
    apiKeys?: UserApiKeys;
}): Promise<string> {
    let model = params.model;
    if (!model.startsWith("claude")) {
        console.warn("[Iroh] completeText: non-Claude model requested, coercing to QUICK_MODEL:", model);
        model = QUICK_MODEL;
    }
    return completeClaudeText({ ...params, model, apiKeys: { claude: null } });
}

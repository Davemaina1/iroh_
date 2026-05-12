"use client";

import { useCallback, useEffect, useState } from "react";
import type { ChatMode } from "../components/assistant/ModeToggle";

const STORAGE_KEY = "iroh.selectedMode";
const DEFAULT_MODE: ChatMode = "quick";

const VALID_MODES = new Set<string>(["quick", "deep", "draft"]);

function readStored(): ChatMode {
    if (typeof window === "undefined") return DEFAULT_MODE;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw && VALID_MODES.has(raw)) return raw as ChatMode;
    return DEFAULT_MODE;
}

export function useSelectedMode(): [ChatMode, (mode: ChatMode) => void] {
    const [mode, setModeState] = useState<ChatMode>(DEFAULT_MODE);

    useEffect(() => {
        setModeState(readStored());
    }, []);

    const setMode = useCallback((next: ChatMode) => {
        const safe = VALID_MODES.has(next) ? next : DEFAULT_MODE;
        setModeState(safe);
        if (typeof window !== "undefined") {
            window.localStorage.setItem(STORAGE_KEY, safe);
        }
    }, []);

    return [mode, setMode];
}

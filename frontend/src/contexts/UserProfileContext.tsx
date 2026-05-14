"use client";

import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
    useCallback,
} from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

async function patchProfile(
    body: Record<string, unknown>,
): Promise<boolean> {
    const {
        data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return false;
    const res = await fetch(`${API_BASE}/user/profile`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
    });
    return res.ok;
}

interface UserProfile {
    displayName: string | null;
    organisation: string | null;
    messageCreditsUsed: number;
    creditsResetDate: string;
    creditsRemaining: number;
    tier: string;
    tabularModel: string;
    claudeApiKey: string | null;
    geminiApiKey: string | null;
}

interface UserProfileContextType {
    profile: UserProfile | null;
    loading: boolean;
    updateDisplayName: (name: string) => Promise<boolean>;
    updateOrganisation: (organisation: string) => Promise<boolean>;
    updateModelPreference: (
        field: "tabularModel",
        value: string,
    ) => Promise<boolean>;
    updateApiKey: (
        provider: "claude" | "gemini",
        value: string | null,
    ) => Promise<boolean>;
    reloadProfile: () => Promise<void>;
    incrementMessageCredits: () => Promise<boolean>;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(
    undefined,
);

export function UserProfileProvider({ children }: { children: ReactNode }) {
    const { user, isAuthenticated } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const loadProfile = useCallback(async (_userId: string) => {
        try {
            const {
                data: { session },
            } = await supabase.auth.getSession();
            if (!session?.access_token) {
                setProfile(null);
                return;
            }

            const res = await fetch(`${API_BASE}/user/profile`, {
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                },
            });

            const MONTHLY_CREDIT_LIMIT = 999999;
            const futureResetDate = new Date();
            futureResetDate.setDate(futureResetDate.getDate() + 30);
            const defaultResetDateStr = futureResetDate.toISOString();

            if (!res.ok) {
                setProfile({
                    displayName: null,
                    organisation: null,
                    messageCreditsUsed: 0,
                    creditsResetDate: defaultResetDateStr,
                    creditsRemaining: MONTHLY_CREDIT_LIMIT,
                    tier: "Free",
                    tabularModel: "gemini-3-flash-preview",
                    claudeApiKey: null,
                    geminiApiKey: null,
                });
                return;
            }

            const data = await res.json();
            let creditsUsed = data.message_credits_used;
            let resetDate = data.credits_reset_date;
            let creditsRemaining = MONTHLY_CREDIT_LIMIT - creditsUsed;

            if (resetDate && new Date() > new Date(resetDate)) {
                const newResetDate = new Date();
                newResetDate.setDate(newResetDate.getDate() + 30);
                resetDate = newResetDate.toISOString();
                creditsUsed = 0;
                creditsRemaining = MONTHLY_CREDIT_LIMIT;
                patchProfile({
                    message_credits_used: 0,
                    credits_reset_date: resetDate,
                });
            }

            setProfile({
                displayName: data.display_name,
                organisation: data.organisation ?? null,
                messageCreditsUsed: creditsUsed,
                creditsResetDate: resetDate,
                creditsRemaining: creditsRemaining,
                tier: data.tier || "Free",
                tabularModel:
                    data.tabular_model || "gemini-3-flash-preview",
                claudeApiKey: data.claude_api_key ?? null,
                geminiApiKey: data.gemini_api_key ?? null,
            });
        } catch {
            const futureResetDate = new Date();
            futureResetDate.setDate(futureResetDate.getDate() + 30);
            setProfile({
                displayName: null,
                organisation: null,
                messageCreditsUsed: 0,
                creditsResetDate: futureResetDate.toISOString(),
                creditsRemaining: 999999,
                tier: "Free",
                tabularModel: "gemini-3-flash-preview",
                claudeApiKey: null,
                geminiApiKey: null,
            });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated && user) {
            setLoading(true);
            loadProfile(user.id);
        } else {
            setProfile(null);
            setLoading(false);
        }
    }, [isAuthenticated, user, loadProfile]);

    const updateDisplayName = useCallback(
        async (displayName: string): Promise<boolean> => {
            if (!user) return false;
            const ok = await patchProfile({ display_name: displayName });
            if (ok) {
                setProfile((prev) =>
                    prev ? { ...prev, displayName } : null,
                );
            }
            return ok;
        },
        [user],
    );

    const updateOrganisation = useCallback(
        async (organisation: string): Promise<boolean> => {
            if (!user) return false;
            const ok = await patchProfile({ organisation });
            if (ok) {
                setProfile((prev) =>
                    prev ? { ...prev, organisation } : null,
                );
            }
            return ok;
        },
        [user],
    );

    const updateModelPreference = useCallback(
        async (
            field: "tabularModel",
            value: string,
        ): Promise<boolean> => {
            if (!user) return false;
            const dbField = field === "tabularModel" ? "tabular_model" : "";
            if (!dbField) return false;
            const ok = await patchProfile({ [dbField]: value });
            if (ok) {
                setProfile((prev) =>
                    prev ? { ...prev, [field]: value } : null,
                );
            }
            return ok;
        },
        [user],
    );

    const updateApiKey = useCallback(
        async (
            provider: "claude" | "gemini",
            value: string | null,
        ): Promise<boolean> => {
            if (!user) return false;
            const dbField =
                provider === "claude" ? "claude_api_key" : "gemini_api_key";
            const stateField =
                provider === "claude" ? "claudeApiKey" : "geminiApiKey";
            const normalized = value?.trim() ? value.trim() : null;
            const ok = await patchProfile({ [dbField]: normalized });
            if (ok) {
                setProfile((prev) =>
                    prev ? { ...prev, [stateField]: normalized } : null,
                );
            }
            return ok;
        },
        [user],
    );

    const reloadProfile = useCallback(async () => {
        if (user) {
            await loadProfile(user.id);
        }
    }, [user, loadProfile]);

    const incrementMessageCredits = useCallback(async (): Promise<boolean> => {
        if (!user || !profile) return false;
        if (profile.creditsRemaining <= 0) return false;

        const newCreditsUsed = profile.messageCreditsUsed + 1;
        const ok = await patchProfile({
            message_credits_used: newCreditsUsed,
        });
        if (ok) {
            setProfile((prev) =>
                prev
                    ? {
                          ...prev,
                          messageCreditsUsed: newCreditsUsed,
                          creditsRemaining: 999999 - newCreditsUsed,
                      }
                    : null,
            );
        }
        return ok;
    }, [user, profile]);

    return (
        <UserProfileContext.Provider
            value={{
                profile,
                loading,
                updateDisplayName,
                updateOrganisation,
                updateModelPreference,
                updateApiKey,
                reloadProfile,
                incrementMessageCredits,
            }}
        >
            {children}
        </UserProfileContext.Provider>
    );
}

export function useUserProfile() {
    const context = useContext(UserProfileContext);
    if (context === undefined) {
        throw new Error(
            "useUserProfile must be used within a UserProfileProvider",
        );
    }
    return context;
}

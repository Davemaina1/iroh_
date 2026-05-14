import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { createServerSupabase } from "../lib/supabase";

export const userRouter = Router();

// POST /user/profile — ensure profile row exists, backfill display_name if missing
userRouter.post("/profile", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const displayName = req.body?.display_name as string | undefined;
  const db = createServerSupabase();

  // Ensure profile row exists
  const { error: upsertErr } = await db
    .from("user_profiles")
    .upsert(
      { user_id: userId },
      { onConflict: "user_id", ignoreDuplicates: true },
    );
  if (upsertErr) return void res.status(500).json({ detail: upsertErr.message });

  // Backfill display_name if provided and currently empty
  if (displayName?.trim()) {
    const { data: existing } = await db
      .from("user_profiles")
      .select("display_name")
      .eq("user_id", userId)
      .single();
    if (!existing?.display_name?.trim()) {
      await db
        .from("user_profiles")
        .update({ display_name: displayName.trim() })
        .eq("user_id", userId);
    }
  }

  res.json({ ok: true });
});

// GET /user/profile — fetch the authenticated user's profile
userRouter.get("/profile", requireAuth, async (_req, res) => {
  const userId = res.locals.userId as string;
  const db = createServerSupabase();
  const { data, error } = await db
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error) return void res.status(500).json({ detail: error.message });
  res.json(data);
});

// PATCH /user/profile
userRouter.patch("/profile", requireAuth, async (req, res) => {
  const userId = res.locals.userId as string;
  const allowedFields = [
    "display_name",
    "organisation",
    "message_credits_used",
    "credits_reset_date",
    "tabular_model",
    "claude_api_key",
    "gemini_api_key",
  ];

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  const db = createServerSupabase();
  const { error } = await db
    .from("user_profiles")
    .update(updates)
    .eq("user_id", userId);

  if (error) return void res.status(500).json({ detail: error.message });
  res.json({ ok: true });
});

// DELETE /user/account
userRouter.delete("/account", requireAuth, async (_req, res) => {
  const userId = res.locals.userId as string;
  const db = createServerSupabase();
  const { error } = await db.auth.admin.deleteUser(userId);
  if (error) return void res.status(500).json({ detail: error.message });
  res.status(204).send();
});

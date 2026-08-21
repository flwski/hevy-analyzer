import "server-only";
import { db } from "@/lib/db";

export type UserPreferences = {
  accentColor: string;
  bodyModel: "male" | "female";
  targetWeight: number | null;
  weeklyGoal: number;
  showInsights: boolean;
  showAdvanced: boolean;
  showHistory: boolean;
  configured: boolean;
};

let initialized: Promise<void> | null = null;

export function ensureUserPreferences() {
  if (!initialized) initialized = (async () => {
    await db()`CREATE TABLE IF NOT EXISTS user_preferences (
      user_id text PRIMARY KEY,
      encrypted_api_key text NOT NULL,
      body_model text NOT NULL DEFAULT 'male',
      target_weight double precision,
      weekly_goal integer NOT NULL DEFAULT 5,
      show_insights boolean NOT NULL DEFAULT true,
      show_advanced boolean NOT NULL DEFAULT true,
      show_history boolean NOT NULL DEFAULT true,
      configured boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`;
    await db()`ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS accent_color text NOT NULL DEFAULT '#c7f34d'`;
    await db()`CREATE TABLE IF NOT EXISTS remembered_devices (
      token_hash text PRIMARY KEY,
      user_id text NOT NULL,
      encrypted_api_key text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      last_used_at timestamptz NOT NULL DEFAULT now()
    )`;
  })();
  return initialized;
}

export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
  await ensureUserPreferences();
  const rows = await db()`SELECT accent_color,body_model,target_weight,weekly_goal,show_insights,show_advanced,show_history,configured FROM user_preferences WHERE user_id=${userId}` as unknown as Record<string, unknown>[];
  const row = rows[0];
  if (!row) return null;
  return {
    accentColor: typeof row.accent_color === "string" ? row.accent_color : "#c7f34d",
    bodyModel: row.body_model === "female" ? "female" : "male",
    targetWeight: row.target_weight == null ? null : Number(row.target_weight),
    weeklyGoal: Number(row.weekly_goal) || 5,
    showInsights: row.show_insights !== false,
    showAdvanced: row.show_advanced !== false,
    showHistory: row.show_history !== false,
    configured: row.configured === true,
  };
}

export async function rememberUser(userId: string, encryptedApiKey: string, rememberTokenHash?: string) {
  await ensureUserPreferences();
  await db()`INSERT INTO user_preferences (user_id,encrypted_api_key) VALUES (${userId},${encryptedApiKey}) ON CONFLICT(user_id) DO UPDATE SET encrypted_api_key=excluded.encrypted_api_key,updated_at=now()`;
  if (rememberTokenHash) await db()`INSERT INTO remembered_devices (token_hash,user_id,encrypted_api_key) VALUES (${rememberTokenHash},${userId},${encryptedApiKey}) ON CONFLICT(token_hash) DO UPDATE SET encrypted_api_key=excluded.encrypted_api_key,last_used_at=now()`;
  return getUserPreferences(userId);
}

export async function findRememberedApiKey(rememberTokenHash: string) {
  await ensureUserPreferences();
  const rows = await db()`UPDATE remembered_devices SET last_used_at=now() WHERE token_hash=${rememberTokenHash} RETURNING encrypted_api_key` as unknown as Array<{ encrypted_api_key?: string }>;
  return rows[0]?.encrypted_api_key ?? null;
}

export async function revokeRememberToken(rememberTokenHash: string) {
  await ensureUserPreferences();
  await db()`DELETE FROM remembered_devices WHERE token_hash=${rememberTokenHash}`;
}

export async function saveUserPreferences(userId: string, encryptedApiKey: string, input: Partial<UserPreferences>) {
  await ensureUserPreferences();
  const bodyModel = input.bodyModel === "female" ? "female" : "male";
  const targetWeight = typeof input.targetWeight === "number" && Number.isFinite(input.targetWeight) && input.targetWeight > 0 ? input.targetWeight : null;
  const weeklyGoal = Math.min(14, Math.max(1, Math.round(Number(input.weeklyGoal) || 5)));
  const allowedAccents = new Set(["#c7f34d", "#f6c945", "#55b8ff", "#a78bfa", "#ff9f43", "#ff6fae", "#35e0d0", "#ff6572"]);
  const accentColor = allowedAccents.has(input.accentColor ?? "") ? input.accentColor! : "#c7f34d";
  await db()`INSERT INTO user_preferences (user_id,encrypted_api_key,accent_color,body_model,target_weight,weekly_goal,show_insights,show_advanced,show_history,configured)
    VALUES (${userId},${encryptedApiKey},${accentColor},${bodyModel},${targetWeight},${weeklyGoal},${input.showInsights !== false},${input.showAdvanced !== false},${input.showHistory !== false},true)
    ON CONFLICT(user_id) DO UPDATE SET encrypted_api_key=excluded.encrypted_api_key,accent_color=excluded.accent_color,body_model=excluded.body_model,target_weight=excluded.target_weight,weekly_goal=excluded.weekly_goal,show_insights=excluded.show_insights,show_advanced=excluded.show_advanced,show_history=excluded.show_history,configured=true,updated_at=now()`;
  return getUserPreferences(userId);
}

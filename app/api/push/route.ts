import { NextRequest, NextResponse } from "next/server";
import { getSessionApiKey, encryptApiKey } from "@/lib/session";
import { validateHevyKey } from "@/lib/hevy";
import { db } from "@/lib/db";
import { processSubscription } from "@/lib/push";

export const runtime = "nodejs";

async function identity() { const apiKey = await getSessionApiKey(); if (!apiKey) return null; const user = await validateHevyKey(apiKey); return { apiKey, user: user.data }; }
export async function GET() {
  try { const current = await identity(); if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const rows = await db()`SELECT endpoint,enabled,notify_workout,notify_pr,notify_streak,notify_recovery,quiet_start,quiet_end FROM push_subscriptions WHERE user_id=${current.user.id} ORDER BY updated_at DESC LIMIT 1` as unknown as Record<string, unknown>[]; return NextResponse.json({ publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, subscription: rows[0] ?? null }); }
  catch { return NextResponse.json({ publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, subscription: null }); }
}
export async function POST(request: NextRequest) {
  try { const current = await identity(); if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const body = await request.json(); const subscription = body.subscription; if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) return NextResponse.json({ error: "Inscrição inválida" }, { status: 400 }); const encrypted = await encryptApiKey(current.apiKey); const rows = await db()`INSERT INTO push_subscriptions (user_id,endpoint,p256dh,auth,encrypted_api_key,last_event_at) VALUES (${current.user.id},${subscription.endpoint},${subscription.keys.p256dh},${subscription.keys.auth},${encrypted},now()-interval '10 minutes') ON CONFLICT(endpoint) DO UPDATE SET user_id=excluded.user_id,p256dh=excluded.p256dh,auth=excluded.auth,encrypted_api_key=excluded.encrypted_api_key,enabled=true,updated_at=now() RETURNING *` as unknown as Record<string, unknown>[]; return NextResponse.json({ ok: true, sync: await processSubscription(rows[0] as never) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao ativar notificações" }, { status: 500 }); }
}
export async function PATCH(request: NextRequest) { const current = await identity(); if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const body = await request.json(); await db()`UPDATE push_subscriptions SET notify_workout=${body.notifyWorkout !== false},notify_pr=${body.notifyPr !== false},notify_streak=${body.notifyStreak !== false},notify_recovery=${body.notifyRecovery !== false},updated_at=now() WHERE user_id=${current.user.id}`; return NextResponse.json({ ok: true }); }
export async function DELETE(request: NextRequest) { const current = await identity(); if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const { endpoint } = await request.json(); await db()`UPDATE push_subscriptions SET enabled=false,updated_at=now() WHERE user_id=${current.user.id} AND endpoint=${endpoint ?? ""}`; return NextResponse.json({ ok: true }); }

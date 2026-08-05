import { NextResponse } from "next/server";
import { getSessionApiKey } from "@/lib/session";
import { validateHevyKey } from "@/lib/hevy";
import { db } from "@/lib/db";
import { processSubscription } from "@/lib/push";
export async function POST() { const key = await getSessionApiKey(); if (!key) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const user = (await validateHevyKey(key)).data; const rows = await db()`SELECT * FROM push_subscriptions WHERE user_id=${user.id} AND enabled=true` as unknown as Record<string, unknown>[]; const results = await Promise.all(rows.map(row => processSubscription(row as never))); return NextResponse.json({ ok: true, results }); }

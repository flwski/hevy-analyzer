import { NextRequest, NextResponse } from "next/server";
import { getSessionApiKey } from "@/lib/session";
import { validateHevyKey } from "@/lib/hevy";
import { db } from "@/lib/db";

async function userId() { const key = await getSessionApiKey(); if (!key) return null; return (await validateHevyKey(key)).data.id; }
export async function GET() { try { const id = await userId(); if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const notifications = await db()`SELECT id,kind,title,body,href,created_at,read_at FROM notifications WHERE user_id=${id} ORDER BY created_at DESC LIMIT 30`; return NextResponse.json({ notifications }); } catch { return NextResponse.json({ notifications: [] }); } }
export async function PATCH(request: NextRequest) { const id = await userId(); if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const body = await request.json(); if (body.all) await db()`UPDATE notifications SET read_at=now() WHERE user_id=${id} AND read_at IS NULL`; else await db()`UPDATE notifications SET read_at=now() WHERE user_id=${id} AND id=${Number(body.id)}`; return NextResponse.json({ ok: true }); }

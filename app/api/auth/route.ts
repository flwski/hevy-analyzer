import { NextRequest, NextResponse } from "next/server";
import { clearSession, setSession } from "@/lib/session";
import { validateHevyKey } from "@/lib/hevy";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json();
    if (typeof apiKey !== "string" || !/^[0-9a-f-]{36}$/i.test(apiKey)) return NextResponse.json({ error: "Informe uma API key válida." }, { status: 400 });
    const user = await validateHevyKey(apiKey.trim());
    await setSession(apiKey.trim());
    return NextResponse.json({ user: user.data });
  } catch { return NextResponse.json({ error: "A API key não foi aceita pelo Hevy." }, { status: 401 }); }
}

export async function DELETE() { await clearSession(); return NextResponse.json({ ok: true }); }

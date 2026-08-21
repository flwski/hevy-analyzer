import { NextRequest, NextResponse } from "next/server";
import { clearSession, createRememberToken, decryptApiKey, encryptApiKey, getSessionApiKey, hashRememberToken, setSession } from "@/lib/session";
import { validateHevyKey } from "@/lib/hevy";
import { findRememberedApiKey, rememberUser, revokeRememberToken } from "@/lib/user-preferences";

export const runtime = "nodejs";

export async function GET() {
  try {
    const apiKey = await getSessionApiKey();
    if (!apiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = await validateHevyKey(apiKey);
    const rememberToken = createRememberToken();
    await rememberUser(user.data.id, await encryptApiKey(apiKey), await hashRememberToken(rememberToken));
    return NextResponse.json({ rememberToken });
  } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
}

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json();
    if (typeof apiKey !== "string" || !/^[0-9a-f-]{36}$/i.test(apiKey)) return NextResponse.json({ error: "Informe uma API key válida." }, { status: 400 });
    const user = await validateHevyKey(apiKey.trim());
    await setSession(apiKey.trim());
    const rememberToken = createRememberToken();
    const preferences = await rememberUser(user.data.id, await encryptApiKey(apiKey.trim()), await hashRememberToken(rememberToken));
    return NextResponse.json({ user: user.data, preferences, rememberToken });
  } catch { return NextResponse.json({ error: "A API key não foi aceita pelo Hevy." }, { status: 401 }); }
}

export async function PUT(request: NextRequest) {
  try {
    const { rememberToken } = await request.json();
    if (typeof rememberToken !== "string" || rememberToken.length < 32) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const encryptedApiKey = await findRememberedApiKey(await hashRememberToken(rememberToken));
    const apiKey = encryptedApiKey ? await decryptApiKey(encryptedApiKey) : null;
    if (!apiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await validateHevyKey(apiKey);
    await setSession(apiKey);
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
}

export async function DELETE(request: NextRequest) {
  try {
    const { rememberToken } = await request.json();
    if (typeof rememberToken === "string" && rememberToken.length >= 32) await revokeRememberToken(await hashRememberToken(rememberToken));
  } catch {}
  await clearSession();
  return NextResponse.json({ ok: true });
}

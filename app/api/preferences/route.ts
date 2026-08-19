import { NextRequest, NextResponse } from "next/server";
import { validateHevyKey } from "@/lib/hevy";
import { encryptApiKey, getSessionApiKey } from "@/lib/session";
import { getUserPreferences, rememberUser, saveUserPreferences } from "@/lib/user-preferences";

export const runtime = "nodejs";

async function identity() {
  const apiKey = await getSessionApiKey();
  if (!apiKey) return null;
  const user = (await validateHevyKey(apiKey)).data;
  return { apiKey, user };
}

export async function GET() {
  try {
    const current = await identity();
    if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const encrypted = await encryptApiKey(current.apiKey);
    const preferences = await getUserPreferences(current.user.id) ?? await rememberUser(current.user.id, encrypted);
    return NextResponse.json({ preferences });
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar as preferências." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const current = await identity();
    if (!current) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const preferences = await saveUserPreferences(current.user.id, await encryptApiKey(current.apiKey), await request.json());
    return NextResponse.json({ preferences });
  } catch {
    return NextResponse.json({ error: "Não foi possível salvar as preferências." }, { status: 500 });
  }
}

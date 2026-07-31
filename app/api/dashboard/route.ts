import { NextResponse } from "next/server";
import { getDashboardData, HevyError } from "@/lib/hevy";

export const runtime = "nodejs";

export async function GET() {
  try {
    return NextResponse.json(await getDashboardData(), { headers: { "Cache-Control": "private, max-age=0, s-maxage=300, stale-while-revalidate=600" } });
  } catch (error) {
    const status = error instanceof HevyError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Não foi possível carregar os dados do Hevy.";
    return NextResponse.json({ error: message }, { status: status >= 400 && status < 600 ? status : 500 });
  }
}

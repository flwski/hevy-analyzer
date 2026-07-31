import { NextRequest, NextResponse } from "next/server";
import { getExerciseHistory, HevyError } from "@/lib/hevy";

export const runtime = "nodejs";
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const { id } = await params; return NextResponse.json(await getExerciseHistory(id, request.nextUrl.searchParams.get("start") ?? undefined, request.nextUrl.searchParams.get("end") ?? undefined)); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Erro ao consultar histórico." }, { status: error instanceof HevyError ? error.status : 500 }); }
}

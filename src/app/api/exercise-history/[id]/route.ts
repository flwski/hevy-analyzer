import { NextResponse } from "next/server";
import { getExerciseHistory } from "@/lib/hevy";
import { buildExerciseSessions } from "@/lib/analytics";
import { handleApiError } from "@/lib/api-error";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const history = await getExerciseHistory(id);
    const sessions = buildExerciseSessions(history);
    return NextResponse.json({ sessions });
  } catch (error) {
    return handleApiError(error);
  }
}

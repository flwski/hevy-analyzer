import { NextResponse } from "next/server";
import { getExerciseTemplate } from "@/lib/hevy";
import { handleApiError } from "@/lib/api-error";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const template = await getExerciseTemplate(id);
    return NextResponse.json(template);
  } catch (error) {
    return handleApiError(error);
  }
}

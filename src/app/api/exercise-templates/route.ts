import { NextRequest, NextResponse } from "next/server";
import { getAllExerciseTemplates } from "@/lib/hevy";
import { handleApiError } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q")?.toLowerCase().trim();
    const muscleGroup = request.nextUrl.searchParams.get("muscleGroup");

    let templates = await getAllExerciseTemplates();

    if (muscleGroup) {
      templates = templates.filter((t) => t.primary_muscle_group === muscleGroup);
    }
    if (query) {
      templates = templates.filter((t) => t.title.toLowerCase().includes(query));
    }

    return NextResponse.json({ exercise_templates: templates });
  } catch (error) {
    return handleApiError(error);
  }
}

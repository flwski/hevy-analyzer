import { NextResponse } from "next/server";
import { getWorkout } from "@/lib/hevy";
import { handleApiError } from "@/lib/api-error";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const workout = await getWorkout(id);
    return NextResponse.json(workout);
  } catch (error) {
    return handleApiError(error);
  }
}

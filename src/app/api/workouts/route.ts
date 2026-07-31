import { NextRequest, NextResponse } from "next/server";
import { getWorkoutsPage } from "@/lib/hevy";
import { workoutVolumeKg, workoutWorkingSetCount } from "@/lib/analytics";
import { handleApiError } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
    const pageSize = Number(request.nextUrl.searchParams.get("pageSize") ?? "10");

    const data = await getWorkoutsPage(page, pageSize);

    return NextResponse.json({
      page: data.page,
      page_count: data.page_count,
      workouts: data.workouts.map((w) => ({
        id: w.id,
        title: w.title,
        start_time: w.start_time,
        end_time: w.end_time,
        exerciseCount: w.exercises.length,
        setCount: workoutWorkingSetCount(w),
        volumeKg: workoutVolumeKg(w),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextResponse } from "next/server";
import { getRecentWorkouts, getWorkoutCount } from "@/lib/hevy";
import {
  averageWorkoutDurationMinutes,
  currentWeekStreak,
  topExercisesByFrequency,
  weeklyVolumeSeries,
  workoutVolumeKg,
} from "@/lib/analytics";
import { handleApiError } from "@/lib/api-error";

export async function GET() {
  try {
    const [{ workout_count }, workouts] = await Promise.all([
      getWorkoutCount(),
      getRecentWorkouts(300),
    ]);

    const now = new Date();
    const startOfThisWeek = new Date(now);
    startOfThisWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    startOfThisWeek.setHours(0, 0, 0, 0);

    const thisWeekWorkouts = workouts.filter(
      (w) => new Date(w.start_time) >= startOfThisWeek
    );

    const totalVolumeRecentKg = workouts.reduce((sum, w) => sum + workoutVolumeKg(w), 0);

    const recentWorkouts = workouts.slice(0, 6).map((w) => ({
      id: w.id,
      title: w.title,
      start_time: w.start_time,
      end_time: w.end_time,
      exerciseCount: w.exercises.length,
      volumeKg: workoutVolumeKg(w),
    }));

    return NextResponse.json({
      totalWorkouts: workout_count,
      analyzedWorkouts: workouts.length,
      thisWeekCount: thisWeekWorkouts.length,
      weekStreak: currentWeekStreak(workouts),
      avgDurationMinutes: averageWorkoutDurationMinutes(workouts),
      totalVolumeRecentKg,
      weeklyVolume: weeklyVolumeSeries(workouts, 12),
      topExercises: topExercisesByFrequency(workouts, 6),
      recentWorkouts,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

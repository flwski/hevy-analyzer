import type { ExerciseHistoryEntry, Workout, WorkoutExercise } from "./types";
import { estimate1RM, isoWeekKey, startOfWeek, workoutDurationSeconds } from "./format";

export function setVolumeKg(set: { type: string; weight_kg: number | null; reps: number | null }): number {
  if (set.type === "warmup") return 0;
  if (set.weight_kg === null || set.reps === null) return 0;
  return set.weight_kg * set.reps;
}

export function workoutVolumeKg(workout: Workout): number {
  let total = 0;
  for (const exercise of workout.exercises) {
    for (const set of exercise.sets) total += setVolumeKg(set);
  }
  return total;
}

export function workoutWorkingSetCount(workout: Workout): number {
  let count = 0;
  for (const exercise of workout.exercises) {
    for (const set of exercise.sets) if (set.type !== "warmup") count++;
  }
  return count;
}

export interface WeeklyVolumePoint {
  weekKey: string;
  weekStart: Date;
  label: string;
  volumeKg: number;
  workoutCount: number;
}

export function weeklyVolumeSeries(workouts: Workout[], weeks = 12): WeeklyVolumePoint[] {
  const now = new Date();
  const buckets = new Map<string, WeeklyVolumePoint>();

  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    const weekStart = startOfWeek(d.toISOString());
    const key = isoWeekKey(d.toISOString());
    buckets.set(key, {
      weekKey: key,
      weekStart,
      label: weekStart.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      volumeKg: 0,
      workoutCount: 0,
    });
  }

  for (const workout of workouts) {
    const key = isoWeekKey(workout.start_time);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.volumeKg += workoutVolumeKg(workout);
    bucket.workoutCount += 1;
  }

  return Array.from(buckets.values());
}

/** Number of consecutive weeks (including the current one) with at least one workout. */
export function currentWeekStreak(workouts: Workout[]): number {
  if (workouts.length === 0) return 0;
  const weeksWithWorkout = new Set(workouts.map((w) => isoWeekKey(w.start_time)));

  let streak = 0;
  const cursor = new Date();
  while (true) {
    const key = isoWeekKey(cursor.toISOString());
    if (weeksWithWorkout.has(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 7);
    } else if (streak === 0) {
      // current week may simply not have a workout yet; check previous week
      cursor.setDate(cursor.getDate() - 7);
      const prevKey = isoWeekKey(cursor.toISOString());
      if (weeksWithWorkout.has(prevKey)) {
        cursor.setDate(cursor.getDate() - 7);
        continue;
      }
      break;
    } else {
      break;
    }
  }
  return streak;
}

export function averageWorkoutDurationMinutes(workouts: Workout[]): number {
  if (workouts.length === 0) return 0;
  const totalSeconds = workouts.reduce(
    (sum, w) => sum + workoutDurationSeconds(w.start_time, w.end_time),
    0
  );
  return Math.round(totalSeconds / workouts.length / 60);
}

export interface ExerciseFrequency {
  title: string;
  exerciseTemplateId: string;
  count: number;
}

export function topExercisesByFrequency(workouts: Workout[], limit = 5): ExerciseFrequency[] {
  const counts = new Map<string, ExerciseFrequency>();
  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      const existing = counts.get(exercise.exercise_template_id);
      if (existing) {
        existing.count++;
      } else {
        counts.set(exercise.exercise_template_id, {
          title: exercise.title,
          exerciseTemplateId: exercise.exercise_template_id,
          count: 1,
        });
      }
    }
  }
  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function heaviestSetInExercise(exercise: WorkoutExercise): number {
  let max = 0;
  for (const set of exercise.sets) {
    if (set.type === "warmup") continue;
    if (set.weight_kg && set.weight_kg > max) max = set.weight_kg;
  }
  return max;
}

export interface ExerciseSessionPoint {
  workoutId: string;
  workoutTitle: string;
  date: string;
  bestWeightKg: number;
  bestWeightReps: number;
  bestEst1RM: number;
  totalVolumeKg: number;
  isWeightPR: boolean;
  isEst1RMPR: boolean;
}

/**
 * Groups raw exercise history entries (one per set) into one point per
 * workout session, tracking the heaviest working set and running PRs.
 */
export function buildExerciseSessions(history: ExerciseHistoryEntry[]): ExerciseSessionPoint[] {
  const byWorkout = new Map<string, ExerciseHistoryEntry[]>();
  for (const entry of history) {
    const list = byWorkout.get(entry.workout_id) ?? [];
    list.push(entry);
    byWorkout.set(entry.workout_id, list);
  }

  const sessions: ExerciseSessionPoint[] = [];
  for (const [workoutId, entries] of byWorkout) {
    const workingSets = entries.filter((e) => e.set_type !== "warmup");
    if (workingSets.length === 0) continue;

    let bestWeightKg = 0;
    let bestWeightReps = 0;
    let bestEst1RM = 0;
    let totalVolumeKg = 0;

    for (const set of workingSets) {
      const weight = set.weight_kg ?? 0;
      const reps = set.reps ?? 0;
      totalVolumeKg += weight * reps;
      if (weight > bestWeightKg) {
        bestWeightKg = weight;
        bestWeightReps = reps;
      }
      const est1RM = estimate1RM(weight, reps);
      if (est1RM > bestEst1RM) bestEst1RM = est1RM;
    }

    sessions.push({
      workoutId,
      workoutTitle: entries[0].workout_title,
      date: entries[0].workout_start_time,
      bestWeightKg,
      bestWeightReps,
      bestEst1RM,
      totalVolumeKg,
      isWeightPR: false,
      isEst1RMPR: false,
    });
  }

  sessions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let runningMaxWeight = 0;
  let runningMaxEst1RM = 0;
  for (const session of sessions) {
    if (session.bestWeightKg > runningMaxWeight) {
      session.isWeightPR = true;
      runningMaxWeight = session.bestWeightKg;
    }
    if (session.bestEst1RM > runningMaxEst1RM) {
      session.isEst1RMPR = true;
      runningMaxEst1RM = session.bestEst1RM;
    }
  }

  return sessions;
}

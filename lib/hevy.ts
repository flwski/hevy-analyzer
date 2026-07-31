import "server-only";
import type { BodyMeasurement, DashboardPayload, ExerciseHistoryEntry, ExerciseTemplate, HevyUser, HevyWorkout, Routine, RoutineFolder } from "./types";
import { getSessionApiKey } from "./session";

const BASE_URL = "https://api.hevyapp.com/v1";

class HevyError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function hevyFetch<T>(path: string, explicitKey?: string): Promise<T> {
  const apiKey = explicitKey ?? await getSessionApiKey();
  if (!apiKey) throw new HevyError(401, "Sessão não autenticada.");
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { "api-key": apiKey, accept: "application/json" },
    next: { revalidate: 300 },
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new HevyError(response.status, detail || `A API do Hevy respondeu com status ${response.status}.`);
  }
  return response.json() as Promise<T>;
}

export async function validateHevyKey(apiKey: string) { return hevyFetch<{ data: HevyUser }>("/user/info", apiKey); }

export async function getDashboardData(): Promise<DashboardPayload> {
  const [userResponse, countResponse, templatesFirst, measurementsFirst, routinesFirst, foldersFirst] = await Promise.all([
    hevyFetch<{ data: HevyUser }>("/user/info"),
    hevyFetch<{ workout_count: number }>("/workouts/count"),
    hevyFetch<{ page_count: number; exercise_templates: ExerciseTemplate[] }>("/exercise_templates?page=1&pageSize=100"),
    hevyFetch<{ page_count: number; body_measurements: BodyMeasurement[] }>("/body_measurements?page=1&pageSize=10").catch(() => ({ page_count: 0, body_measurements: [] })),
    hevyFetch<{ page_count: number; routines: Routine[] }>("/routines?page=1&pageSize=10").catch(() => ({ page_count: 0, routines: [] })),
    hevyFetch<{ page_count: number; routine_folders: RoutineFolder[] }>("/routine_folders?page=1&pageSize=10").catch(() => ({ page_count: 0, routine_folders: [] })),
  ]);
  const workoutCount = countResponse.workout_count ?? 0;
  const maxPages = Math.min(Math.max(Number(process.env.HEVY_MAX_WORKOUT_PAGES) || 20, 1), 100);
  const pages = Math.min(Math.ceil(workoutCount / 10), maxPages);
  const [results, templateRest, measurementRest, routineRest, folderRest] = await Promise.all([Promise.all(Array.from({ length: pages }, (_, i) =>
    hevyFetch<{ workouts: HevyWorkout[] }>(`/workouts?page=${i + 1}&pageSize=10`)
  )), Promise.all(Array.from({ length: Math.max(0, templatesFirst.page_count - 1) }, (_, i) => hevyFetch<{ exercise_templates: ExerciseTemplate[] }>(`/exercise_templates?page=${i + 2}&pageSize=100`))), Promise.all(Array.from({ length: Math.max(0, measurementsFirst.page_count - 1) }, (_, i) => hevyFetch<{ body_measurements: BodyMeasurement[] }>(`/body_measurements?page=${i + 2}&pageSize=10`))), Promise.all(Array.from({ length: Math.max(0, routinesFirst.page_count - 1) }, (_, i) => hevyFetch<{ routines: Routine[] }>(`/routines?page=${i + 2}&pageSize=10`))), Promise.all(Array.from({ length: Math.max(0, foldersFirst.page_count - 1) }, (_, i) => hevyFetch<{ routine_folders: RoutineFolder[] }>(`/routine_folders?page=${i + 2}&pageSize=10`)))]);
  const workouts = results.flatMap((item) => item.workouts ?? []).sort((a, b) => +new Date(b.start_time) - +new Date(a.start_time));
  const bodyMeasurements = [...measurementsFirst.body_measurements, ...measurementRest.flatMap(x => x.body_measurements ?? [])].sort((a,b) => +new Date(a.date) - +new Date(b.date));
  return { user: userResponse.data ?? null, workoutCount, workouts, exerciseTemplates: [...(templatesFirst.exercise_templates ?? []), ...templateRest.flatMap(x => x.exercise_templates ?? [])], bodyMeasurements, routines: [...routinesFirst.routines, ...routineRest.flatMap(x => x.routines ?? [])], routineFolders: [...foldersFirst.routine_folders, ...folderRest.flatMap(x => x.routine_folders ?? [])], fetchedAt: new Date().toISOString(), truncated: workoutCount > workouts.length };
}

export async function getExerciseHistory(id: string, start?: string, end?: string) {
  const query = new URLSearchParams(); if (start) query.set("start_date", start); if (end) query.set("end_date", end);
  return hevyFetch<{ exercise_history: ExerciseHistoryEntry[] }>(`/exercise_history/${encodeURIComponent(id)}?${query}`);
}

export { HevyError };

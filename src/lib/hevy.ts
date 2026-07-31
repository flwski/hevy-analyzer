import "server-only";
import type {
  BodyMeasurement,
  ExerciseHistoryEntry,
  ExerciseTemplate,
  PaginatedBodyMeasurements,
  PaginatedExerciseTemplates,
  PaginatedRoutineFolders,
  PaginatedRoutines,
  PaginatedWorkouts,
  Routine,
  RoutineFolder,
  UserInfo,
  Workout,
} from "./types";

const BASE_URL = "https://api.hevyapp.com/v1";

function apiKey(): string {
  const key = process.env.HEVY_API_KEY;
  if (!key) {
    throw new Error(
      "HEVY_API_KEY is not set. Add it to your .env.local (locally) or your Vercel project's Environment Variables (in production)."
    );
  }
  return key;
}

// Revalidate window for Next.js Data Cache. Kept short enough that new
// workouts logged in Hevy show up quickly, long enough to avoid hammering
// the upstream API on every request.
const DEFAULT_REVALIDATE = 120;

class HevyApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "HevyApiError";
  }
}

async function hevyFetch<T>(
  path: string,
  searchParams?: Record<string, string | number | undefined>,
  revalidate: number = DEFAULT_REVALIDATE
): Promise<T> {
  const url = new URL(BASE_URL + path);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }

  const res = await fetch(url, {
    headers: {
      "api-key": apiKey(),
      accept: "application/json",
    },
    next: { revalidate },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new HevyApiError(
      res.status,
      `Hevy API ${res.status} on ${path}: ${body || res.statusText}`
    );
  }

  return res.json() as Promise<T>;
}

export { HevyApiError };

export function getUserInfo() {
  return hevyFetch<{ data: UserInfo }>("/user/info", undefined, 3600);
}

export function getWorkoutCount() {
  return hevyFetch<{ workout_count: number }>("/workouts/count", undefined, 60);
}

export function getWorkoutsPage(page: number, pageSize = 10) {
  return hevyFetch<PaginatedWorkouts>("/workouts", { page, pageSize });
}

export function getWorkout(workoutId: string) {
  return hevyFetch<Workout>(`/workouts/${workoutId}`);
}

/**
 * Aggregates workout pages in parallel (after learning page_count from page 1)
 * up to `maxWorkouts`, bounding worst-case latency on serverless.
 */
export async function getRecentWorkouts(maxWorkouts = 300): Promise<Workout[]> {
  const pageSize = 10;
  const first = await getWorkoutsPage(1, pageSize);
  const workouts = [...first.workouts];

  const pagesNeeded = Math.min(
    first.page_count,
    Math.ceil(maxWorkouts / pageSize)
  );

  if (pagesNeeded > 1) {
    const pagePromises: Promise<PaginatedWorkouts>[] = [];
    for (let p = 2; p <= pagesNeeded; p++) {
      pagePromises.push(getWorkoutsPage(p, pageSize));
    }
    const pages = await Promise.all(pagePromises);
    for (const page of pages) workouts.push(...page.workouts);
  }

  workouts.sort(
    (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
  );

  return workouts.slice(0, maxWorkouts);
}

export function getRoutinesPage(page: number, pageSize = 10) {
  return hevyFetch<PaginatedRoutines>("/routines", { page, pageSize }, 600);
}

export async function getAllRoutines(maxRoutines = 200): Promise<Routine[]> {
  const pageSize = 10;
  const first = await getRoutinesPage(1, pageSize);
  const routines = [...first.routines];
  const pagesNeeded = Math.min(first.page_count, Math.ceil(maxRoutines / pageSize));

  if (pagesNeeded > 1) {
    const promises: Promise<PaginatedRoutines>[] = [];
    for (let p = 2; p <= pagesNeeded; p++) promises.push(getRoutinesPage(p, pageSize));
    const pages = await Promise.all(promises);
    for (const page of pages) routines.push(...page.routines);
  }

  return routines.slice(0, maxRoutines);
}

export function getRoutineFoldersPage(page: number, pageSize = 10) {
  return hevyFetch<PaginatedRoutineFolders>("/routine_folders", { page, pageSize }, 600);
}

export async function getAllRoutineFolders(): Promise<RoutineFolder[]> {
  const first = await getRoutineFoldersPage(1, 10);
  const folders = [...first.routine_folders];
  const pagesNeeded = first.page_count;
  if (pagesNeeded > 1) {
    const promises: Promise<PaginatedRoutineFolders>[] = [];
    for (let p = 2; p <= pagesNeeded; p++) promises.push(getRoutineFoldersPage(p, 10));
    const pages = await Promise.all(promises);
    for (const page of pages) folders.push(...page.routine_folders);
  }
  return folders.sort((a, b) => a.index - b.index);
}

export function getExerciseTemplatesPage(page: number, pageSize = 100) {
  return hevyFetch<PaginatedExerciseTemplates>(
    "/exercise_templates",
    { page, pageSize },
    3600
  );
}

export function getExerciseTemplate(exerciseTemplateId: string) {
  return hevyFetch<ExerciseTemplate>(`/exercise_templates/${exerciseTemplateId}`, undefined, 3600);
}

export async function getAllExerciseTemplates(): Promise<ExerciseTemplate[]> {
  const pageSize = 100;
  const first = await getExerciseTemplatesPage(1, pageSize);
  const templates = [...first.exercise_templates];
  const pagesNeeded = first.page_count;

  if (pagesNeeded > 1) {
    const promises: Promise<PaginatedExerciseTemplates>[] = [];
    for (let p = 2; p <= pagesNeeded; p++) promises.push(getExerciseTemplatesPage(p, pageSize));
    const pages = await Promise.all(promises);
    for (const page of pages) templates.push(...page.exercise_templates);
  }

  return templates;
}

export async function getExerciseHistory(
  exerciseTemplateId: string,
  opts?: { startDate?: string; endDate?: string }
): Promise<ExerciseHistoryEntry[]> {
  const { exercise_history } = await hevyFetch<{
    exercise_history: ExerciseHistoryEntry[];
  }>(`/exercise_history/${exerciseTemplateId}`, {
    start_date: opts?.startDate,
    end_date: opts?.endDate,
  });
  return exercise_history;
}

export function getBodyMeasurementsPage(page: number, pageSize = 10) {
  return hevyFetch<PaginatedBodyMeasurements>(
    "/body_measurements",
    { page, pageSize },
    300
  );
}

export async function getAllBodyMeasurements(maxEntries = 200): Promise<BodyMeasurement[]> {
  const pageSize = 10;
  const first = await getBodyMeasurementsPage(1, pageSize);
  const entries = [...first.body_measurements];
  const pagesNeeded = Math.min(first.page_count, Math.ceil(maxEntries / pageSize));

  if (pagesNeeded > 1) {
    const promises: Promise<PaginatedBodyMeasurements>[] = [];
    for (let p = 2; p <= pagesNeeded; p++) promises.push(getBodyMeasurementsPage(p, pageSize));
    const pages = await Promise.all(promises);
    for (const page of pages) entries.push(...page.body_measurements);
  }

  return entries
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, maxEntries);
}

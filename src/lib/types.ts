export type SetType = "warmup" | "normal" | "failure" | "dropset";

export interface WorkoutSet {
  index: number;
  type: SetType;
  weight_kg: number | null;
  reps: number | null;
  distance_meters: number | null;
  duration_seconds: number | null;
  rpe: number | null;
  custom_metric: number | null;
}

export interface WorkoutExercise {
  index: number;
  title: string;
  notes: string | null;
  exercise_template_id: string;
  supersets_id: number | null;
  sets: WorkoutSet[];
}

export interface Workout {
  id: string;
  title: string;
  routine_id: string | null;
  description: string | null;
  start_time: string;
  end_time: string;
  updated_at: string;
  created_at: string;
  exercises: WorkoutExercise[];
}

export interface PaginatedWorkouts {
  page: number;
  page_count: number;
  workouts: Workout[];
}

export type EquipmentCategory =
  | "none"
  | "barbell"
  | "dumbbell"
  | "kettlebell"
  | "machine"
  | "plate"
  | "resistance_band"
  | "suspension"
  | "other";

export type MuscleGroup =
  | "abdominals"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "forearms"
  | "quadriceps"
  | "hamstrings"
  | "calves"
  | "glutes"
  | "abductors"
  | "adductors"
  | "lats"
  | "upper_back"
  | "traps"
  | "lower_back"
  | "chest"
  | "cardio"
  | "neck"
  | "full_body"
  | "other";

export interface ExerciseTemplate {
  id: string;
  title: string;
  type: string;
  primary_muscle_group: MuscleGroup;
  secondary_muscle_groups: string[];
  equipment_category: EquipmentCategory;
  is_custom: boolean;
}

export interface PaginatedExerciseTemplates {
  page: number;
  page_count: number;
  exercise_templates: ExerciseTemplate[];
}

export interface ExerciseHistoryEntry {
  workout_id: string;
  workout_title: string;
  workout_start_time: string;
  workout_end_time: string;
  exercise_template_id: string;
  weight_kg: number | null;
  reps: number | null;
  distance_meters: number | null;
  duration_seconds: number | null;
  rpe: number | null;
  custom_metric: number | null;
  set_type: SetType;
}

export interface RoutineSet {
  index: number;
  type: SetType;
  weight_kg: number | null;
  reps: number | null;
  rep_range: { start: number | null; end: number | null } | null;
  distance_meters: number | null;
  duration_seconds: number | null;
  rpe: number | null;
  custom_metric: number | null;
}

export interface RoutineExercise {
  index: number;
  title: string;
  rest_seconds: number | null;
  notes: string | null;
  exercise_template_id: string;
  supersets_id: number | null;
  sets: RoutineSet[];
}

export interface Routine {
  id: string;
  title: string;
  folder_id: number | null;
  notes?: string | null;
  updated_at: string;
  created_at: string;
  exercises: RoutineExercise[];
}

export interface PaginatedRoutines {
  page: number;
  page_count: number;
  routines: Routine[];
}

export interface RoutineFolder {
  id: number;
  index: number;
  title: string;
  updated_at: string;
  created_at: string;
}

export interface PaginatedRoutineFolders {
  page: number;
  page_count: number;
  routine_folders: RoutineFolder[];
}

export interface BodyMeasurement {
  date: string;
  weight_kg: number | null;
  lean_mass_kg: number | null;
  fat_percent: number | null;
  neck_cm: number | null;
  shoulder_cm: number | null;
  chest_cm: number | null;
  left_bicep_cm: number | null;
  right_bicep_cm: number | null;
  left_forearm_cm: number | null;
  right_forearm_cm: number | null;
  abdomen: number | null;
  waist: number | null;
  hips: number | null;
  left_thigh: number | null;
  right_thigh: number | null;
  left_calf: number | null;
  right_calf: number | null;
}

export interface PaginatedBodyMeasurements {
  page: number;
  page_count: number;
  body_measurements: BodyMeasurement[];
}

export interface UserInfo {
  id: string;
  name: string;
  url: string;
}

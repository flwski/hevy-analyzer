export function kgToLb(kg: number): number {
  return kg * 2.20462262185;
}

export function formatWeight(kg: number | null | undefined, unit: "kg" | "lb"): string {
  if (kg === null || kg === undefined) return "-";
  const value = unit === "kg" ? kg : kgToLb(kg);
  return `${round(value, 1)} ${unit}`;
}

export function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function formatDate(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Date(iso).toLocaleDateString("pt-BR", opts ?? {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

export function workoutDurationSeconds(startIso: string, endIso: string): number {
  return Math.max(
    0,
    (new Date(endIso).getTime() - new Date(startIso).getTime()) / 1000
  );
}

/** Epley formula estimated 1-rep max. */
export function estimate1RM(weightKg: number, reps: number): number {
  if (reps <= 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

export function isoDateOnly(iso: string): string {
  return iso.slice(0, 10);
}

/** Monday-based ISO week key, e.g. "2024-W07". */
export function isoWeekKey(iso: string): string {
  const date = new Date(iso);
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function startOfWeek(iso: string): Date {
  const date = new Date(iso);
  const day = date.getDay() || 7;
  const monday = new Date(date);
  monday.setDate(date.getDate() - day + 1);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

import "server-only";
import webpush from "web-push";
import type { HevyWorkout } from "./types";
import { db } from "./db";
import { decryptApiKey } from "./session";

type SubscriptionRow = { id: number; user_id: string; endpoint: string; p256dh: string; auth: string; encrypted_api_key: string; last_event_at: string; notify_workout: boolean; notify_pr: boolean; notify_streak: boolean; notify_recovery: boolean; quiet_start?: string | null; quiet_end?: string | null };
type WorkoutEvent = { type: "updated"; workout: HevyWorkout } | { type: "deleted"; id: string; deleted_at: string };
type CoachSlot = 8 | 11 | 15 | 19;

function volume(workout: HevyWorkout) { return workout.exercises.flatMap(e => e.sets).reduce((sum, set) => sum + (set.weight_kg ?? 0) * (set.reps ?? 0), 0); }
function configurePush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) throw new Error("Chaves VAPID não configuradas.");
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:notifications@example.com", publicKey, privateKey);
}

export async function processSubscription(row: SubscriptionRow) {
  const apiKey = await decryptApiKey(row.encrypted_api_key);
  if (!apiKey) return { sent: 0, error: "invalid-key" };
  const since = encodeURIComponent(new Date(row.last_event_at).toISOString());
  const response = await fetch(`https://api.hevyapp.com/v1/workouts/events?page=1&pageSize=10&since=${since}`, { headers: { "api-key": apiKey, accept: "application/json" }, cache: "no-store" });
  if (!response.ok) return { sent: 0, error: `hevy-${response.status}` };
  const payload = await response.json() as { events?: WorkoutEvent[] };
  const events = (payload.events ?? []).filter((event): event is Extract<WorkoutEvent, { type: "updated" }> => event.type === "updated").sort((a, b) => +new Date(a.workout.updated_at) - +new Date(b.workout.updated_at));
  let sent = 0;
  configurePush();
  for (const event of events) {
    const workout = event.workout;
    const totalVolume = volume(workout);
    const effectiveSets = workout.exercises.flatMap(e => e.sets).filter(s => s.type !== "warmup");
    const duration = Math.max(0, (+new Date(workout.end_time) - +new Date(workout.start_time)) / 60000);
    const title = "Treino concluído. Mandou bem! 💪";
    const body = `${workout.title}: ${workout.exercises.length} exercícios, ${effectiveSets.length} séries e ${new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(totalVolume)} kg em ${Math.round(duration)} min.`;
    const inserted = await db()`INSERT INTO notifications (user_id, workout_id, kind, title, body, href) VALUES (${row.user_id}, ${workout.id}, 'workout', ${title}, ${body}, '/calendar') ON CONFLICT (user_id, workout_id, kind) DO NOTHING RETURNING id` as unknown as Record<string, unknown>[];
    if (!inserted.length || !row.notify_workout) continue;
    try { await webpush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, JSON.stringify({ title, body, href: "/calendar", tag: `workout-${workout.id}` })); sent++; }
    catch (error: unknown) { const status = typeof error === "object" && error && "statusCode" in error ? Number((error as { statusCode: unknown }).statusCode) : 0; if (status === 404 || status === 410) await db()`UPDATE push_subscriptions SET enabled=false WHERE id=${row.id}`; }
  }
  await db()`UPDATE push_subscriptions SET last_event_at=now(), updated_at=now() WHERE id=${row.id}`;
  return { sent, events: events.length };
}

export async function processAllSubscriptions() {
  const rows = await db()`SELECT * FROM push_subscriptions WHERE enabled=true` as SubscriptionRow[];
  const results = await Promise.allSettled(rows.map(processSubscription));
  return { subscriptions: rows.length, sent: results.reduce((sum, result) => sum + (result.status === "fulfilled" ? result.value.sent : 0), 0) };
}

function saoPauloParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false,
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? "";
  return { date: `${value("year")}-${value("month")}-${value("day")}`, hour: Number(value("hour")) };
}

function scheduledCoachMessage(slot: CoachSlot, workouts: HevyWorkout[], now = new Date()) {
  const localToday = saoPauloParts(now).date;
  const completed = [...workouts].sort((a, b) => +new Date(b.start_time) - +new Date(a.start_time));
  const today = completed.find(workout => {
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(workout.start_time));
    return date === localToday;
  });
  const weekStart = new Date(now.getTime() - 7 * 86400000);
  const week = completed.filter(workout => new Date(workout.start_time) >= weekStart);
  const last = completed[0];
  const hoursSinceLast = last ? Math.max(0, (now.getTime() - new Date(last.end_time).getTime()) / 3600000) : null;
  const sessionSummary = today ? `${today.title}: ${today.exercises.length} exercícios e ${today.exercises.flatMap(e => e.sets).filter(s => s.type !== "warmup").length} séries.` : "";

  if (slot === 8) {
    if (hoursSinceLast !== null && hoursSinceLast < 24) return { title: "Bom dia! Recuperação também é treino ☀️", body: `Seu último treino foi há ${Math.max(1, Math.round(hoursSinceLast))}h. Hidrate-se, alimente-se bem e observe a fadiga antes de aumentar a carga.` };
    return { title: "Bom dia! Vamos construir o treino de hoje? ☀️", body: week.length ? `Você fez ${week.length} treino${week.length === 1 ? "" : "s"} nos últimos 7 dias. Escolha uma meta simples para hoje e comece com intenção.` : "Uma sessão curta hoje já quebra a inércia. Comece leve e deixe o ritmo fazer o restante." };
  }
  if (slot === 11) return { title: "Check-in de consistência do Coach 🎯", body: today ? `Treino registrado hoje. ${sessionSummary} Excelente forma de proteger sua consistência.` : `Você soma ${week.length} treino${week.length === 1 ? "" : "s"} nos últimos 7 dias. Ainda dá tempo de reservar um horário e manter o compromisso.` };
  if (slot === 15) return { title: today ? "O trabalho de hoje já está feito 💪" : "Seu treino não precisa ser perfeito", body: today ? `${sessionSummary} Agora priorize água, proteína e recuperação.` : "Precisa apenas acontecer. Separe roupa, água e o primeiro exercício — reduzir a fricção aumenta muito a chance de começar." };
  return { title: today ? "Fechamento do dia com o Coach 🌙" : "Fechamento do Coach: prepare o próximo passo", body: today ? `${sessionSummary} Registre como se sentiu e durma bem para transformar estímulo em progresso.` : week.length ? `Foram ${week.length} treinos nos últimos 7 dias. Se hoje foi descanso, defina agora o horário da próxima sessão.` : "Hoje pode ter sido descanso. Deixe o próximo treino decidido e torne o amanhã mais fácil." };
}

async function recentWorkouts(apiKey: string) {
  const response = await fetch("https://api.hevyapp.com/v1/workouts?page=1&pageSize=10", { headers: { "api-key": apiKey, accept: "application/json" }, cache: "no-store" });
  if (!response.ok) throw new Error(`hevy-${response.status}`);
  const payload = await response.json() as { workouts?: HevyWorkout[] };
  return payload.workouts ?? [];
}

async function sendCoachNotification(row: SubscriptionRow, slot: CoachSlot, date: string) {
  const preferenceEnabled = slot === 11 || slot === 15 ? row.notify_streak : row.notify_recovery;
  if (!preferenceEnabled) return { sent: 0, skipped: "preference" };
  const apiKey = await decryptApiKey(row.encrypted_api_key);
  if (!apiKey) return { sent: 0, skipped: "invalid-key" };
  const message = scheduledCoachMessage(slot, await recentWorkouts(apiKey));
  const key = `coach-${date}-${slot}`;
  const kind = `coach_${slot}`;
  const inserted = await db()`INSERT INTO notifications (user_id, workout_id, kind, title, body, href) VALUES (${row.user_id}, ${key}, ${kind}, ${message.title}, ${message.body}, '/coach') ON CONFLICT (user_id, workout_id, kind) DO NOTHING RETURNING id` as unknown as Record<string, unknown>[];
  if (!inserted.length) return { sent: 0, skipped: "duplicate" };
  configurePush();
  try {
    await webpush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, JSON.stringify({ ...message, href: "/coach", tag: key }));
    return { sent: 1 };
  } catch (error: unknown) {
    const status = typeof error === "object" && error && "statusCode" in error ? Number((error as { statusCode: unknown }).statusCode) : 0;
    if (status === 404 || status === 410) await db()`UPDATE push_subscriptions SET enabled=false WHERE id=${row.id}`;
    return { sent: 0, skipped: `push-${status || "error"}` };
  }
}

export async function processScheduledCoachNotifications(now = new Date(), forcedSlot?: number) {
  const { date, hour } = saoPauloParts(now);
  const selectedHour = forcedSlot ?? hour;
  if (![8, 11, 15, 19].includes(selectedHour)) return { slot: null, subscriptions: 0, sent: 0 };
  const slot = selectedHour as CoachSlot;
  const rows = await db()`SELECT * FROM push_subscriptions WHERE enabled=true` as SubscriptionRow[];
  const results = await Promise.allSettled(rows.map(row => sendCoachNotification(row, slot, date)));
  return { slot, subscriptions: rows.length, sent: results.reduce((sum, result) => sum + (result.status === "fulfilled" ? result.value.sent : 0), 0) };
}

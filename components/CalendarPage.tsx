"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, CalendarDays, ChevronLeft, ChevronRight, Clock3, Flame, Gauge, Sparkles, Target } from "lucide-react";
import AppSidebar from "./AppSidebar";
import { ExerciseAnalysis, WorkoutAnalysis, WorkoutCalendar } from "./Dashboard";
import type { DashboardPayload, HevyWorkout } from "@/lib/types";

const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const compact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

function workoutVolume(workout: HevyWorkout) {
  return workout.exercises.reduce((sum, exercise) => sum + exercise.sets.reduce((total, set) => total + (set.weight_kg ?? 0) * (set.reps ?? 0), 0), 0);
}

function YearHeatmap({ workouts, onOpenWorkout }: { workouts: HevyWorkout[]; onOpenWorkout: (id: string) => void }) {
  const availableYears = useMemo(() => [...new Set(workouts.map(workout => new Date(workout.start_time).getFullYear()))].sort((a, b) => a - b), [workouts]);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(availableYears.includes(currentYear) ? currentYear : availableYears.at(-1) ?? currentYear);
  const heatmap = useMemo(() => {
    const daily = new Map<string, { workouts: HevyWorkout[]; volume: number; sets: number }>();
    workouts.filter(workout => new Date(workout.start_time).getFullYear() === year).forEach(workout => {
      const key = dateKey(new Date(workout.start_time));
      const entry = daily.get(key) ?? { workouts: [], volume: 0, sets: 0 };
      entry.workouts.push(workout);
      entry.volume += workoutVolume(workout);
      entry.sets += workout.exercises.reduce((sum, exercise) => sum + exercise.sets.filter(set => set.type !== "warmup").length, 0);
      daily.set(key, entry);
    });
    const january = new Date(year, 0, 1, 12);
    const start = new Date(january); start.setDate(start.getDate() - start.getDay());
    const december = new Date(year, 11, 31, 12);
    const end = new Date(december); end.setDate(end.getDate() + (6 - end.getDay()));
    const days: Date[] = [];
    for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) days.push(new Date(cursor));
    const activeVolumes = [...daily.values()].map(day => day.volume).filter(Boolean).sort((a, b) => a - b);
    const threshold = (ratio: number) => activeVolumes[Math.max(0, Math.ceil(activeVolumes.length * ratio) - 1)] ?? 0;
    const q1 = threshold(.25), q2 = threshold(.5), q3 = threshold(.75);
    const months = Array.from({ length: 12 }, (_, month) => {
      const first = new Date(year, month, 1, 12);
      const column = Math.floor((+first - +start) / 864e5 / 7) + 1;
      return { month, column };
    }).filter((item, index, all) => index === 0 || item.column !== all[index - 1].column);
    const sessions = [...daily.values()].reduce((sum, day) => sum + day.workouts.length, 0);
    const activeDays = daily.size;
    const totalVolume = [...daily.values()].reduce((sum, day) => sum + day.volume, 0);
    const longest = (() => { let best = 0, running = 0; days.forEach(day => { if (day.getFullYear() !== year) return; if (daily.has(dateKey(day))) { running++; best = Math.max(best, running); } else running = 0; }); return best; })();
    return { daily, days, months, q1, q2, q3, sessions, activeDays, totalVolume, longest, columns: days.length / 7 };
  }, [workouts, year]);
  const yearIndex = availableYears.indexOf(year);
  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const fullDate = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  return <section className="year-heatmap panel">
    <header className="heatmap-head"><div><p className="eyebrow">VISÃO ANUAL</p><h2>Seu ano em movimento.</h2><p>Cada bloco representa um dia. A intensidade acompanha o volume registrado.</p></div><div className="heatmap-year-nav"><button onClick={() => setYear(availableYears[yearIndex - 1])} disabled={yearIndex <= 0} aria-label="Ano anterior"><ChevronLeft /></button><strong>{year}</strong><button onClick={() => setYear(availableYears[yearIndex + 1])} disabled={yearIndex < 0 || yearIndex >= availableYears.length - 1} aria-label="Próximo ano"><ChevronRight /></button></div></header>
    <div className="heatmap-kpis"><span><b>{heatmap.sessions}</b> treinos</span><span><b>{heatmap.activeDays}</b> dias ativos</span><span><b>{compact.format(heatmap.totalVolume)} kg</b> volume</span><span><b>{heatmap.longest}</b> maior sequência</span></div>
    <div className="heatmap-scroll"><div className="heatmap-chart" style={{ "--heatmap-columns": heatmap.columns } as React.CSSProperties}>
      <div className="heatmap-months">{heatmap.months.map(({ month, column }) => <span key={month} style={{ gridColumn: column }}>{monthNames[month]}</span>)}</div>
      <div className="heatmap-weekdays"><span>Dom</span><span>Ter</span><span>Qui</span><span>Sáb</span></div>
      <div className="heatmap-grid">{heatmap.days.map(day => { const key = dateKey(day); const entry = heatmap.daily.get(key); const outside = day.getFullYear() !== year; const level = !entry ? 0 : entry.volume <= heatmap.q1 ? 1 : entry.volume <= heatmap.q2 ? 2 : entry.volume <= heatmap.q3 ? 3 : 4; const label = entry ? `${fullDate.format(day)} · ${entry.workouts.length} treino${entry.workouts.length > 1 ? "s" : ""} · ${entry.sets} séries · ${compact.format(entry.volume)} kg` : `${fullDate.format(day)} · sem treino`; return <button key={key} className={`heatmap-day level-${level}${outside ? " outside" : ""}`} disabled={!entry || outside} onClick={() => entry && onOpenWorkout(entry.workouts[0].id)} aria-label={label} data-tooltip={label}><span>{day.getDate()}</span></button>; })}</div>
    </div></div>
    <div className="heatmap-footer"><span>Menos</span>{[0, 1, 2, 3, 4].map(level => <i key={level} className={`level-${level}`} />)}<span>Mais volume</span><small>Passe o mouse para ver os detalhes · clique para analisar</small></div>
  </section>;
}

export default function CalendarPage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedWorkout, setSelectedWorkout] = useState<HevyWorkout | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<{ name: string; templateId: string } | null>(null);
  useEffect(() => { fetch("/api/dashboard").then(async response => { if (response.status === 401) { location.href = "/"; return null; } return response.json(); }).then(value => value && setData(value)).finally(() => setLoading(false)); }, []);
  const summary = useMemo(() => { if (!data) return null; const now = new Date(); const month = data.workouts.filter(workout => { const day = new Date(workout.start_time); return day.getMonth() === now.getMonth() && day.getFullYear() === now.getFullYear(); }); const previousDate = new Date(now.getFullYear(), now.getMonth() - 1, 1); const previous = data.workouts.filter(workout => { const day = new Date(workout.start_time); return day.getMonth() === previousDate.getMonth() && day.getFullYear() === previousDate.getFullYear(); }); const unique = new Set(month.map(workout => new Date(workout.start_time).toDateString())).size; const volume = month.reduce((sum, workout) => sum + workoutVolume(workout), 0); const duration = month.reduce((sum, workout) => sum + Math.max(0, (+new Date(workout.end_time) - +new Date(workout.start_time)) / 60000), 0); const weekdays = new Map<number, number>(); data.workouts.forEach(workout => { const day = new Date(workout.start_time).getDay(); weekdays.set(day, (weekdays.get(day) ?? 0) + 1); }); const favorite = [...weekdays].sort((a,b) => b[1]-a[1])[0]?.[0]; const orderedDays = [...new Set(data.workouts.map(workout => new Date(workout.start_time).setHours(12,0,0,0)))].sort((a,b)=>b-a).slice(0,16); const gaps = orderedDays.slice(0,-1).map((day,index)=>(day-orderedDays[index+1])/86400000); const averageGap = gaps.length ? gaps.reduce((sum,gap)=>sum+gap,0)/gaps.length : 0; const change = previous.length ? (month.length / previous.length - 1) * 100 : null; return { count: month.length, unique, volume, averageDuration: month.length ? duration/month.length : 0, favorite: favorite == null ? "—" : ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"][favorite], averageGap, change }; }, [data]);
  if (loading || !data) return <main className="center-state"><div className="loader" /><p>{"Montando seu calend\u00e1rio\u2026"}</p></main>;
  function openWorkout(id: string) { setSelectedWorkout(data!.workouts.find(workout => workout.id === id) ?? null); setSelectedExercise(null); }
  return <div className="app-shell">
    <AppSidebar active="calendar" user={data.user} workoutCount={data.workoutCount} />
    <main className="content section-page">
      <header><div><p className="eyebrow">PLANEJAMENTO</p><h1>{"Calend\u00e1rio de treinos"}</h1><p className="subtitle">{"Enxergue sua consist\u00eancia, ritmo e distribui\u00e7\u00e3o ao longo do tempo."}</p></div></header>
      <section className="page-summary"><article><CalendarDays /><div><span>{"Treinos neste m\u00eas"}</span><strong>{summary?.count ?? 0}</strong></div></article><article><Flame /><div><span>Dias ativos</span><strong>{summary?.unique ?? 0}</strong></div></article><article><Target /><div><span>Volume mensal</span><strong>{number.format((summary?.volume ?? 0) / 1000)} t</strong></div></article></section>
      <YearHeatmap workouts={data.workouts} onOpenWorkout={openWorkout} />
      <section className="calendar-insights">
        <article><div><Gauge /></div><span>Ritmo mensal</span><strong>{summary?.change == null ? "Primeira leitura" : `${summary.change >= 0 ? "+" : ""}${number.format(summary.change)}%`}</strong><small>comparado ao mês anterior</small></article>
        <article><div><Clock3 /></div><span>Duração média</span><strong>{number.format(summary?.averageDuration ?? 0)} min</strong><small>por sessão neste mês</small></article>
        <article><div><CalendarDays /></div><span>Intervalo típico</span><strong>{number.format(summary?.averageGap ?? 0)} dias</strong><small>entre os últimos treinos</small></article>
        <article className="calendar-coach-note"><Sparkles /><div><span>PADRÃO DO ATLETA</span><strong>{summary?.favorite ?? "—"}</strong><small>é o dia em que você mais costuma treinar</small></div></article>
      </section>
      <WorkoutCalendar workouts={data.workouts} onOpenWorkout={openWorkout} />
      <section className="calendar-tip panel"><Activity /><div><p className="eyebrow">{"LEITURA R\u00c1PIDA"}</p><h2>{"Consist\u00eancia vence intensidade isolada."}</h2><p>{"Selecione um treino no calend\u00e1rio para analisar a sess\u00e3o e abrir a progress\u00e3o individual de cada exerc\u00edcio."}</p></div><ChevronRight /></section>
      <footer><span><Activity /> Dados sincronizados com Hevy</span><span>Atualizado {new Date(data.fetchedAt).toLocaleString("pt-BR")}</span></footer>
    </main>
    {selectedWorkout && <WorkoutAnalysis workout={selectedWorkout} workouts={data.workouts} templates={data.exerciseTemplates} onClose={() => { setSelectedWorkout(null); setSelectedExercise(null); }} onOpenExercise={(name, templateId) => setSelectedExercise({ name, templateId })} />}
    {selectedExercise && <ExerciseAnalysis name={selectedExercise.name} templateId={selectedExercise.templateId} workouts={data.workouts} onClose={() => setSelectedExercise(null)} />}
  </div>;
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Clock3, Dumbbell, Eye, EyeOff, Flame, Gauge, KeyRound, Layers3, LogOut, Moon, RefreshCw, Ruler, Scale, Search, Settings2, Sparkles, Sun, Target, Trophy, TrendingUp, X } from "lucide-react";
import type { DashboardPayload, ExerciseHistoryEntry, HevyWorkout } from "@/lib/types";

const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const compact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
const date = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

function volumeOf(w: HevyWorkout) { return w.exercises.flatMap(e => e.sets).reduce((sum, s) => sum + (s.weight_kg ?? 0) * (s.reps ?? 0), 0); }
function setsOf(w: HevyWorkout) { return w.exercises.reduce((sum, e) => sum + e.sets.filter(s => s.type !== "warmup").length, 0); }
function durationOf(w: HevyWorkout) { return Math.max(0, (+new Date(w.end_time) - +new Date(w.start_time)) / 60000); }

function MiniBars({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return <div className="mini-bars" aria-label="Tendência dos últimos treinos">{values.map((v, i) => <span key={i} style={{ height: `${Math.max(8, v / max * 100)}%`, animationDelay: `${i * 70}ms` }} />)}</div>;
}

function LineChart({ points, unit = "kg" }: { points: { label: string; value: number }[]; unit?: string }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(...points.map(p => p.value), 1);
  const min = Math.min(...points.map(p => p.value)); const valueRange = Math.max(max - min, max * .08, 1);
  const pointY = (value:number) => 88 - (value - min) / valueRange * 70;
  const d = points.map((p, i) => `${i ? "L" : "M"} ${i * 100 / Math.max(points.length - 1, 1)} ${pointY(p.value)}`).join(" ");
  const animationKey = points.map(p => Math.round(p.value)).join("-");
  const active = hovered != null ? points[hovered] : null; const x = hovered != null ? hovered * 100 / Math.max(points.length - 1, 1) : 0; const y = active ? pointY(active.value) : 0;
  function locate(clientX: number, element: HTMLElement) { const rect=element.getBoundingClientRect(); const ratio=Math.max(0,Math.min(1,(clientX-rect.left)/rect.width)); setHovered(Math.round(ratio*(points.length-1))); }
  return <div className="chart-wrap" key={animationKey}><div className="chart-interactive" onPointerMove={e=>locate(e.clientX,e.currentTarget)} onPointerDown={e=>locate(e.clientX,e.currentTarget)} onPointerLeave={()=>setHovered(null)}><svg className="chart-svg" viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Evolução ao longo do tempo"><defs><linearGradient id={`area-${animationKey}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c7f34d" stopOpacity=".35"/><stop offset="1" stopColor="#c7f34d" stopOpacity="0"/></linearGradient></defs><g className="chart-reveal"><path className="chart-area" d={`${d} L 100 100 L 0 100 Z`} fill={`url(#area-${animationKey})`}/><path className="chart-line" d={d} fill="none" stroke="var(--lime)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"/></g></svg>{active&&<div className="chart-cursor" style={{left:`${x}%`}}><i/><span className="chart-dot" style={{top:`${y}%`}}/><div className={`chart-tooltip ${x>72?"align-right":""}`} style={{top:`${Math.max(4,y-3)}%`}}><small>{active.label}</small><strong>{number.format(active.value)} <b>{unit}</b></strong>{min>0&&<em>{number.format((active.value/min-1)*100)}% acima do menor valor</em>}</div></div>}</div><div className="chart-labels"><span>{points[0]?.label}</span><span>{points.at(-1)?.label}</span></div></div>;
}

function ExerciseAnalysis({ name, templateId, workouts, onClose }: { name: string; templateId?: string; workouts: HevyWorkout[]; onClose: () => void }) {
  const [apiHistory, setApiHistory] = useState<ExerciseHistoryEntry[]>([]);
  useEffect(() => { if (!templateId) return; fetch(`/api/exercises/${encodeURIComponent(templateId)}/history`).then(r => r.ok ? r.json() : null).then(x => x?.exercise_history && setApiHistory(x.exercise_history)).catch(() => {}); }, [templateId]);
  const sessions = workouts.flatMap(w => w.exercises.filter(e => e.title === name).map(e => ({ workout: w, exercise: e }))).sort((a, b) => +new Date(a.workout.start_time) - +new Date(b.workout.start_time));
  const allSets = sessions.flatMap(s => s.exercise.sets.map(set => ({ ...set, date: s.workout.start_time }))).filter(s => s.type !== "warmup");
  const weighted = allSets.filter(s => (s.weight_kg ?? 0) > 0 && (s.reps ?? 0) > 0);
  const maxWeight = Math.max(...weighted.map(s => s.weight_kg ?? 0), 0);
  const bestSet = weighted.reduce<(typeof weighted)[number] | null>((best, s) => !best || (s.weight_kg ?? 0) * (1 + (s.reps ?? 0) / 30) > (best.weight_kg ?? 0) * (1 + (best.reps ?? 0) / 30) ? s : best, null);
  const best1rm = bestSet ? (bestSet.weight_kg ?? 0) * (1 + (bestSet.reps ?? 0) / 30) : 0;
  const totalVolume = weighted.reduce((sum, s) => sum + (s.weight_kg ?? 0) * (s.reps ?? 0), 0);
  const firstDate = sessions[0] ? +new Date(sessions[0].workout.start_time) : Date.now();
  const activeWeeks = Math.max(1, (Date.now() - firstDate) / 604800000);
  const progression = sessions.map(s => ({ label: new Date(s.workout.start_time).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }), value: Math.max(...s.exercise.sets.map(x => (x.weight_kg ?? 0) * (1 + (x.reps ?? 0) / 30)), 0) })).filter(p => p.value > 0).slice(-16);
  const recent = progression.slice(-4); const previous = progression.slice(-8, -4);
  const avg = (x: { value: number }[]) => x.length ? x.reduce((s, p) => s + p.value, 0) / x.length : 0;
  const change = previous.length ? (avg(recent) / avg(previous) - 1) * 100 : 0;
  const rpeValues = apiHistory.map(x => x.rpe).filter((x): x is number => x != null); const avgRpe = rpeValues.length ? rpeValues.reduce((s,x) => s+x,0)/rpeValues.length : null;
  const insight = progression.length < 3 ? "Continue registrando este exercício para criar uma tendência confiável." : change > 3 ? `Sua força estimada subiu ${number.format(change)}% nas sessões recentes. O estímulo atual está funcionando.` : change < -3 ? `A força estimada caiu ${number.format(Math.abs(change))}% recentemente. Considere recuperação, sono e redução temporária do volume.` : `Sua força está estável nas sessões recentes. Para avançar, tente adicionar 1 repetição ou uma pequena carga mantendo a execução.`;
  return <div className="analysis-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}><section className="analysis-drawer" role="dialog" aria-modal="true" aria-label={`Análise de ${name}`}><div className="analysis-top"><div><p className="eyebrow">ANÁLISE DO EXERCÍCIO</p><h2>{name}</h2></div><button className="icon-button" onClick={onClose} aria-label="Fechar"><X/></button></div>
    <div className="exercise-kpis"><div><span>1RM estimado</span><strong>{number.format(best1rm)} kg</strong></div><div><span>Carga máxima</span><strong>{number.format(maxWeight)} kg</strong></div><div><span>Volume total</span><strong>{compact.format(totalVolume)} kg</strong></div><div><span>Frequência</span><strong>{number.format(sessions.length / activeWeeks)}×/sem</strong></div></div>{apiHistory.length > 0 && <div className="history-sync"><Activity/><span>{apiHistory.length} séries no histórico completo da API</span><b>RPE médio: {avgRpe != null ? number.format(avgRpe) : "não registrado"}</b></div>}
    <article className="insight-card"><Sparkles/><div><span>INSIGHT DE PROGRESSÃO</span><p>{insight}</p></div></article>
    <article className="analysis-chart"><div className="panel-head"><div><p className="eyebrow">FORÇA</p><h3>1RM estimado por sessão</h3></div>{change !== 0 && <b className={change > 0 ? "positive" : "negative"}>{change > 0 ? "+" : ""}{number.format(change)}%</b>}</div>{progression.length > 1 ? <LineChart points={progression}/> : <div className="empty">Ainda não há sessões suficientes para a curva.</div>}</article>
    <div className="best-set"><div className="stat-icon"><Target/></div><span>MELHOR SÉRIE REGISTRADA</span><strong>{bestSet ? `${number.format(bestSet.weight_kg ?? 0)} kg × ${bestSet.reps ?? 0} reps` : "Sem carga registrada"}</strong><small>{bestSet ? date.format(new Date(bestSet.date)) : "—"} · 1RM estimado de {number.format(best1rm)} kg</small></div>
    <div className="session-history"><div className="panel-head"><div><p className="eyebrow">HISTÓRICO</p><h3>Últimas sessões</h3></div><span>{sessions.length} sessões</span></div>{sessions.slice().reverse().slice(0, 10).map(({ workout, exercise }) => <div className="exercise-session" key={workout.id}><div><strong>{date.format(new Date(workout.start_time))}</strong><span>{workout.title}</span></div><div className="set-pills">{exercise.sets.filter(s => s.type !== "warmup").map(s => <span key={s.index}>{s.weight_kg != null ? `${number.format(s.weight_kg)}kg` : ""}{s.weight_kg != null && s.reps != null ? " × " : ""}{s.reps ?? ""}</span>)}</div></div>)}</div>
  </section></div>;
}

function WorkoutCalendar({ workouts, onOpenWorkout }: { workouts: HevyWorkout[]; onOpenWorkout: (id: string) => void }) {
  const [month, setMonth] = useState(() => { const latest = workouts[0] ? new Date(workouts[0].start_time) : new Date(); return new Date(latest.getFullYear(), latest.getMonth(), 1); });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const byDay = useMemo(() => { const map = new Map<string, HevyWorkout[]>(); workouts.forEach(w => { const d = new Date(w.start_time); const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; map.set(key, [...(map.get(key) ?? []), w]); }); return map; }, [workouts]);
  const firstOffset = (month.getDay() + 6) % 7;
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((firstOffset + daysInMonth) / 7) * 7 }, (_, i) => i - firstOffset + 1);
  const monthWorkouts = workouts.filter(w => { const d = new Date(w.start_time); return d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth(); });
  const selected = selectedDay ? byDay.get(selectedDay) ?? [] : [];
  const today = new Date();
  function move(delta: number) { setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1)); setSelectedDay(null); }
  return <section className="calendar-section" id="calendario"><div className="section-head calendar-title"><div><p className="eyebrow">CONSISTÊNCIA</p><h2>Calendário de treinos</h2><p>{monthWorkouts.length} {monthWorkouts.length === 1 ? "treino" : "treinos"} neste mês</p></div><div className="calendar-nav"><button className="icon-button" onClick={() => move(-1)} aria-label="Mês anterior"><ChevronLeft/></button><strong>{month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</strong><button className="icon-button" onClick={() => move(1)} aria-label="Próximo mês"><ChevronRight/></button></div></div>
    <div className="calendar-layout"><div className="calendar-card"><div className="weekdays">{["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"].map(d => <span key={d}>{d}</span>)}</div><div className="calendar-grid">{cells.map((day, i) => { const valid = day > 0 && day <= daysInMonth; const key = `${month.getFullYear()}-${month.getMonth()}-${day}`; const sessions = valid ? byDay.get(key) ?? [] : []; const isToday = valid && day === today.getDate() && month.getMonth() === today.getMonth() && month.getFullYear() === today.getFullYear(); return <button key={i} disabled={!valid} className={`${sessions.length ? "trained" : ""} ${selectedDay === key ? "selected" : ""} ${isToday ? "today" : ""}`} onClick={() => sessions.length && setSelectedDay(key)}><b>{valid ? day : ""}</b>{sessions.length > 0 && <><span>{sessions.length > 1 ? `${sessions.length} treinos` : sessions[0].title}</span><i style={{ "--intensity": Math.min(1, sessions.reduce((s, w) => s + volumeOf(w), 0) / 15000) } as React.CSSProperties}/></>}</button>; })}</div></div>
      <aside className="day-summary"><div><p className="eyebrow">{selected.length ? "DIA SELECIONADO" : "RESUMO DO MÊS"}</p><h3>{selected.length ? new Date(selected[0].start_time).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }) : month.toLocaleDateString("pt-BR", { month: "long" })}</h3></div>{selected.length ? selected.map(w => <button key={w.id} onClick={() => onOpenWorkout(w.id)}><div className="calendar-workout-icon"><Dumbbell/></div><div><strong>{w.title}</strong><span>{w.exercises.length} exercícios · {setsOf(w)} séries</span><small>{compact.format(volumeOf(w))} kg · {number.format(durationOf(w))} min</small></div><ChevronRight/></button>) : <><div className="month-ring"><strong>{monthWorkouts.length}</strong><span>sessões</span></div><div className="month-totals"><span><b>{compact.format(monthWorkouts.reduce((s,w) => s + volumeOf(w), 0))} kg</b>volume</span><span><b>{number.format(monthWorkouts.reduce((s,w) => s + durationOf(w), 0) / 60)} h</b>tempo</span></div><p className="calendar-help">Clique em um dia marcado para ver os treinos.</p></>}</aside>
    </div></section>;
}

const muscleNames: Record<string, string> = { chest: "Peito", shoulders: "Ombros", biceps: "Bíceps", triceps: "Tríceps", forearms: "Antebraços", upper_back: "Costas superiores", lats: "Dorsais", lower_back: "Lombar", quadriceps: "Quadríceps", hamstrings: "Posteriores", glutes: "Glúteos", calves: "Panturrilhas", abdominals: "Abdômen", full_body: "Corpo inteiro", cardio: "Cardio", other: "Outros" };
function DeepAnalytics({ data, workouts }: { data: DashboardPayload; workouts: HevyWorkout[] }) {
  const templateMap = new Map(data.exerciseTemplates.map(t => [t.id, t]));
  const muscleVolume = new Map<string, number>(); const equipment = new Map<string, number>();
  workouts.forEach(w => w.exercises.forEach(e => { const t = templateMap.get(e.exercise_template_id); const volume = e.sets.reduce((s,x) => s + (x.weight_kg ?? 0) * (x.reps ?? 0), 0); const muscle = t?.primary_muscle_group ?? "other"; muscleVolume.set(muscle, (muscleVolume.get(muscle) ?? 0) + volume); const eq = t?.equipment_category ?? "other"; equipment.set(eq, (equipment.get(eq) ?? 0) + e.sets.length); }));
  const muscles = [...muscleVolume].sort((a,b) => b[1] - a[1]); const maxMuscle = Math.max(...muscles.map(x => x[1]), 1);
  const measurements = data.bodyMeasurements; const latest = measurements.at(-1); const previous = measurements.at(-2);
  const weightPoints = measurements.filter(m => m.weight_kg != null).slice(-16).map(m => ({ label: new Date(`${m.date}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }), value: m.weight_kg! }));
  const fatPoints = measurements.filter(m => m.fat_percent != null).slice(-16).map(m => ({ label: new Date(`${m.date}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }), value: m.fat_percent! }));
  const adherence = workouts.length ? workouts.filter(w => w.routine_id).length / workouts.length * 100 : 0;
  const dominant = muscles[0]; const neglected = muscles.filter(([,v]) => v < maxMuscle * .18).slice(0,2);
  const insight = dominant ? `${muscleNames[dominant[0]] ?? dominant[0]} concentra a maior parte do volume (${number.format(dominant[1] / Math.max(1, muscles.reduce((s,x) => s+x[1],0)) * 100)}%). ${neglected.length ? `Atenção a ${neglected.map(x => muscleNames[x[0]] ?? x[0]).join(" e ")}, com estímulo proporcionalmente baixo.` : "A distribuição entre os demais grupos está equilibrada."}` : "Ainda não há dados suficientes para avaliar o equilíbrio muscular.";
  return <section className="deep-analytics" id="insights"><div className="section-head"><div><p className="eyebrow">ANÁLISE AVANÇADA</p><h2>Corpo, equilíbrio e planejamento</h2></div><span className="data-badge">{data.exerciseTemplates.length} exercícios catalogados</span></div>
    <div className="body-grid"><article className="panel body-panel"><div className="panel-head"><div><p className="eyebrow">COMPOSIÇÃO CORPORAL</p><h3>Evolução física</h3></div><Scale/></div>{latest ? <><div className="body-kpis"><div><span>Peso</span><strong>{latest.weight_kg != null ? `${number.format(latest.weight_kg)} kg` : "—"}</strong><small>{latest.weight_kg != null && previous?.weight_kg != null ? `${latest.weight_kg - previous.weight_kg >= 0 ? "+" : ""}${number.format(latest.weight_kg - previous.weight_kg)} kg` : "sem comparação"}</small></div><div><span>Gordura</span><strong>{latest.fat_percent != null ? `${number.format(latest.fat_percent)}%` : "—"}</strong><small>percentual corporal</small></div><div><span>Massa magra</span><strong>{latest.lean_mass_kg != null ? `${number.format(latest.lean_mass_kg)} kg` : "—"}</strong><small>última medição</small></div></div>{weightPoints.length > 1 ? <LineChart points={weightPoints}/> : <div className="measurement-empty"><Ruler/><span>Registre mais medidas no Hevy para visualizar a curva corporal.</span></div>}</> : <div className="measurement-empty"><Scale/><strong>Sem medidas corporais</strong><span>Registre peso e medidas no Hevy para cruzá-los com sua evolução de força.</span></div>}</article>
      <article className="panel muscle-panel"><div className="panel-head"><div><p className="eyebrow">DISTRIBUIÇÃO</p><h3>Volume por grupo muscular</h3></div><Layers3/></div><div className="muscle-bars">{muscles.slice(0,8).map(([name,value]) => <div key={name}><span>{muscleNames[name] ?? name}</span><div><i style={{ width: `${value/maxMuscle*100}%` }}/></div><b>{compact.format(value)} kg</b></div>)}{!muscles.length && <div className="empty">Sem volume com carga no período.</div>}</div></article></div>
    <div className="planning-grid"><article className="panel adherence-card"><div className="gauge" style={{ "--progress": `${adherence * 3.6}deg` } as React.CSSProperties}><div><strong>{number.format(adherence)}%</strong><span>aderência</span></div></div><div><p className="eyebrow">PLANEJAMENTO</p><h3>Rotina × execução</h3><p>{workouts.filter(w => w.routine_id).length} de {workouts.length} treinos vieram de uma rotina planejada.</p><span>{data.routines.length} rotinas · {data.routineFolders.length} pastas</span></div></article><article className="insight-card global-insight"><Sparkles/><div><span>INSIGHT DE EQUILÍBRIO</span><p>{insight}</p></div></article><article className="panel equipment-card"><Gauge/><div><p className="eyebrow">EQUIPAMENTOS</p><h3>{[...equipment].sort((a,b)=>b[1]-a[1])[0]?.[0]?.replaceAll("_"," ") ?? "—"}</h3><p>Equipamento mais usado no período</p></div></article></div>
    {fatPoints.length > 1 && <article className="panel fat-chart"><div className="panel-head"><div><p className="eyebrow">COMPOSIÇÃO</p><h3>Percentual de gordura</h3></div><span>{number.format(fatPoints.at(-1)!.value)}% atual</span></div><LineChart points={fatPoints} unit="%"/></article>}
  </section>;
}

type Preferences = { weeklyGoal: number; targetWeight: number; showInsights: boolean; showAdvanced: boolean; showCalendar: boolean; showHistory: boolean };
const defaultPreferences: Preferences = { weeklyGoal: 5, targetWeight: 120, showInsights: true, showAdvanced: true, showCalendar: true, showHistory: true };

function PersonalInsights({ data, prefs }: { data: DashboardPayload; prefs: Preferences }) {
  const sorted = data.workouts.slice().sort((a,b) => +new Date(a.start_time) - +new Date(b.start_time)); const first = sorted[0]; const last = sorted.at(-1);
  const spanWeeks = first && last ? Math.max(1, (+new Date(last.start_time) - +new Date(first.start_time)) / 604800000) : 1;
  const weekly = sorted.length / spanWeeks; const measurements = data.bodyMeasurements; const firstWeight = measurements.find(m => m.weight_kg != null)?.weight_kg; const latestWeight = measurements.slice().reverse().find(m => m.weight_kg != null)?.weight_kg;
  const weightChange = firstWeight != null && latestWeight != null ? latestWeight - firstWeight : null;
  const weekdays = new Map<number,number>(); sorted.forEach(w => { const d = new Date(w.start_time).getDay(); weekdays.set(d,(weekdays.get(d)??0)+1); }); const bestDay = [...weekdays].sort((a,b)=>b[1]-a[1])[0];
  const templateMap = new Map(data.exerciseTemplates.map(t => [t.id,t])); const muscle = new Map<string,number>(); sorted.forEach(w => w.exercises.forEach(e => { const m=templateMap.get(e.exercise_template_id)?.primary_muscle_group??"other"; muscle.set(m,(muscle.get(m)??0)+e.sets.reduce((s,x)=>s+(x.weight_kg??0)*(x.reps??0),0)); })); const lead=[...muscle].sort((a,b)=>b[1]-a[1])[0];
  const goalProgress = Math.min(100, weekly / Math.max(1,prefs.weeklyGoal)*100); const weightRemaining = latestWeight != null ? latestWeight - prefs.targetWeight : null;
  return <section className="personal-section"><div className="section-head"><div><p className="eyebrow">SEU MOMENTO</p><h2>Insights personalizados</h2></div><span className="live-label"><i/> Baseado no seu histórico</span></div><div className="personal-grid">
    <article className="personal-card highlight"><div className="personal-icon"><TrendingUp/></div><span>EVOLUÇÃO CORPORAL</span><strong>{weightChange != null ? `${weightChange > 0?"+":""}${number.format(weightChange)} kg` : "Sem dados"}</strong><p>{weightChange != null && weightChange < 0 ? `Redução desde ${new Date(`${measurements[0].date}T12:00:00`).toLocaleDateString("pt-BR",{month:"short"})}. Faltam ${number.format(Math.max(0,weightRemaining??0))} kg para sua meta.` : "Registre seu peso para acompanhar a tendência."}</p></article>
    <article className="personal-card"><div className="personal-icon"><Flame/></div><span>RITMO DE TREINO</span><strong>{number.format(weekly)}× <small>/ semana</small></strong><div className="goal-bar"><i style={{width:`${goalProgress}%`}}/></div><p>{goalProgress>=100?"Meta semanal atingida com consistência.":`${number.format(goalProgress)}% da meta de ${prefs.weeklyGoal} treinos.`}</p></article>
    <article className="personal-card"><div className="personal-icon"><CalendarDays/></div><span>SEU MELHOR DIA</span><strong>{bestDay ? ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"][bestDay[0]] : "—"}</strong><p>{bestDay ? `${bestDay[1]} sessões registradas neste dia da semana.` : "Histórico insuficiente."}</p></article>
    <article className="personal-card"><div className="personal-icon"><Target/></div><span>FOCO MUSCULAR</span><strong>{lead ? muscleNames[lead[0]]??lead[0] : "—"}</strong><p>{lead ? `Maior concentração de volume. Use a análise avançada para verificar o equilíbrio.` : "Sem volume calculável."}</p></article>
  </div></section>;
}

function SettingsPanel({ value, onChange, onClose }: { value: Preferences; onChange: (p: Preferences) => void; onClose: () => void }) {
  const sections: Array<[keyof Preferences,string]> = [["showInsights","Insights pessoais"],["showAdvanced","Análises avançadas"],["showCalendar","Calendário"],["showHistory","Histórico de treinos"]];
  return <div className="analysis-overlay settings-overlay" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><section className="settings-panel"><div className="analysis-top"><div><p className="eyebrow">PERSONALIZAÇÃO</p><h2>Sua dashboard</h2><p>Escolha metas e o que deseja acompanhar.</p></div><button className="icon-button" onClick={onClose}><X/></button></div><div className="setting-fields"><label><span>Meta de treinos por semana</span><input type="number" min="1" max="14" value={value.weeklyGoal} onChange={e=>onChange({...value,weeklyGoal:Math.max(1,Number(e.target.value))})}/></label><label><span>Peso-alvo (kg)</span><input type="number" min="30" max="300" step="0.1" value={value.targetWeight} onChange={e=>onChange({...value,targetWeight:Number(e.target.value)})}/></label></div><div className="settings-list"><p className="eyebrow">SEÇÕES VISÍVEIS</p>{sections.map(([key,label])=><button key={key} onClick={()=>onChange({...value,[key]:!value[key]})}><span>{label}</span><i className={value[key]?"checked":""}>{value[key]&&<Check/>}</i></button>)}</div><button className="primary save-settings" onClick={onClose}>Salvar preferências</button></section></div>;
}

function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [apiKey,setApiKey]=useState(""); const [visible,setVisible]=useState(false); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");try{const r=await fetch("/api/auth",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({apiKey})});const j=await r.json();if(!r.ok)throw new Error(j.error);setApiKey("");onSuccess();}catch(e){setError(e instanceof Error?e.message:"Não foi possível entrar.");}finally{setBusy(false)}}
  return <main className="login-screen"><div className="login-glow"/><section className="login-card"><div className="login-brand"><div className="brand-mark"><Dumbbell/></div><span>HEVY <b>ANALYTICS</b></span></div><div className="login-icon"><KeyRound/></div><p className="eyebrow">ACESSO SEGURO</p><h1>Entre com sua API key.</h1><p className="login-copy">Conecte sua conta do Hevy para transformar seus treinos em análises pessoais.</p><form onSubmit={submit}><label><span>API key do Hevy</span><div className="key-input"><input autoFocus required type={visible?"text":"password"} value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="00000000-0000-0000-0000-000000000000" autoComplete="off"/><button type="button" onClick={()=>setVisible(!visible)} aria-label={visible?"Ocultar chave":"Mostrar chave"}>{visible?<EyeOff/>:<Eye/>}</button></div></label>{error&&<div className="login-error">{error}</div>}<button className="primary login-submit" disabled={busy}>{busy?<><RefreshCw className="spin"/>Conectando…</>:"Entrar na dashboard"}</button></form><div className="security-note"><Check/><span>Sua chave é criptografada em um cookie de sessão e nunca fica disponível para scripts do navegador.</span></div><a href="https://hevy.com/settings?developer" target="_blank" rel="noreferrer">Onde encontro minha API key?</a></section></main>;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(90);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const r = await fetch("/api/dashboard"); const json = await r.json(); if(r.status===401){setAuthenticated(false);setData(null);return;} if (!r.ok) throw new Error(json.error); setData(json); setAuthenticated(true); }
    catch (e) { setError(e instanceof Error ? e.message : "Erro inesperado."); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const saved = sessionStorage.getItem("hevy-theme"); const initial = saved === "light" || saved === "dark" ? saved : matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"; setTheme(initial); document.documentElement.dataset.theme = initial; }, []);
  useEffect(() => { try { const saved=sessionStorage.getItem("hevy-preferences"); if(saved) setPreferences({...defaultPreferences,...JSON.parse(saved)}); } catch {} }, []);
  function updatePreferences(next: Preferences){setPreferences(next);sessionStorage.setItem("hevy-preferences",JSON.stringify(next));}
  async function logout(){await fetch("/api/auth",{method:"DELETE"});sessionStorage.removeItem("hevy-preferences");setPreferences(defaultPreferences);setData(null);setAuthenticated(false);}
  function toggleTheme() { const next = theme === "dark" ? "light" : "dark"; setTheme(next); document.documentElement.dataset.theme = next; sessionStorage.setItem("hevy-theme", next); }

  const filtered = useMemo(() => {
    if (!data) return [];
    const cutoff = Date.now() - range * 86400000;
    return data.workouts.filter(w => +new Date(w.start_time) >= cutoff);
  }, [data, range]);
  const stats = useMemo(() => {
    const totalVolume = filtered.reduce((s, w) => s + volumeOf(w), 0);
    const totalMinutes = filtered.reduce((s, w) => s + durationOf(w), 0);
    const exerciseMap = new Map<string, { sets: number; volume: number; max: number }>();
    filtered.forEach(w => w.exercises.forEach(e => { const current = exerciseMap.get(e.title) ?? { sets: 0, volume: 0, max: 0 }; e.sets.forEach(s => { current.sets++; current.volume += (s.weight_kg ?? 0) * (s.reps ?? 0); current.max = Math.max(current.max, s.weight_kg ?? 0); }); exerciseMap.set(e.title, current); }));
    const exercises = [...exerciseMap.entries()].sort((a, b) => b[1].sets - a[1].sets);
    const weeks = new Map<string, number>();
    filtered.slice().reverse().forEach(w => { const d = new Date(w.start_time); const monday = new Date(d); monday.setDate(d.getDate() - ((d.getDay() + 6) % 7)); const key = monday.toISOString().slice(0, 10); weeks.set(key, (weeks.get(key) ?? 0) + volumeOf(w)); });
    const chart = [...weeks].slice(-12).map(([key, value]) => ({ label: new Date(`${key}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }), value }));
    return { totalVolume, totalMinutes, exercises, chart, avgVolume: filtered.length ? totalVolume / filtered.length : 0 };
  }, [filtered]);
  const visibleWorkouts = filtered.filter(w => `${w.title} ${w.exercises.map(e => e.title).join(" ")}`.toLowerCase().includes(query.toLowerCase()));

  if (authenticated===false) return <LoginScreen onSuccess={load}/>;
  if (loading && !data) return <main className="center-state"><div className="loader"/><p>Sincronizando seus treinos…</p></main>;
  if (error && !data) return <main className="center-state"><div className="error-icon">!</div><h1>Não foi possível conectar</h1><p>{error}</p><button className="primary" onClick={load}>Tentar novamente</button></main>;

  return <div className="app-shell">
    <aside><div className="brand"><div className="brand-mark"><Dumbbell size={22}/></div><span>HEVY<br/><b>ANALYTICS</b></span></div><nav><a className="active"><BarChart3/>Visão geral</a><a href="#calendario"><CalendarDays/>Calendário</a><a href="#exercicios"><Dumbbell/>Exercícios</a></nav><div className="side-profile"><div className="avatar">{data?.user?.name?.[0] ?? "H"}</div><div><strong>{data?.user?.name ?? "Atleta"}</strong><small>{data?.workoutCount ?? 0} treinos no Hevy</small></div></div></aside>
    <main className="content">
      <header><div><p className="eyebrow">VISÃO GERAL</p><h1>Seu treino, em números.</h1><p className="subtitle">Consistência vira resultado quando você consegue enxergá-la.</p></div><div className="header-actions"><select value={range} onChange={e => setRange(Number(e.target.value))} aria-label="Período"><option value={30}>Últimos 30 dias</option><option value={90}>Últimos 90 dias</option><option value={180}>Últimos 6 meses</option><option value={3650}>Todo o período</option></select><button className="icon-button" onClick={()=>setSettingsOpen(true)} title="Personalizar dashboard"><Settings2/></button><button className="icon-button theme-toggle" onClick={toggleTheme} title={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"} aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}>{theme === "dark" ? <Sun/> : <Moon/>}</button><button className="icon-button" onClick={load} title="Atualizar"><RefreshCw className={loading ? "spin" : ""}/></button><button className="icon-button logout-button" onClick={logout} title="Sair"><LogOut/></button></div></header>
      {data?.truncated && <div className="notice">Exibindo os {data.workouts.length} treinos mais recentes. Ajuste HEVY_MAX_WORKOUT_PAGES para ampliar o histórico.</div>}
      <section className="stats-grid">
        <article className="stat-card lime"><div className="stat-icon"><Flame/></div><span>Treinos</span><strong>{filtered.length}</strong><small>no período selecionado</small><MiniBars values={filtered.slice(0, 8).reverse().map(setsOf)}/></article>
        <article className="stat-card"><div className="stat-icon"><TrendingUp/></div><span>Volume total</span><strong>{compact.format(stats.totalVolume)} <i>kg</i></strong><small>{compact.format(stats.avgVolume)} kg por treino</small></article>
        <article className="stat-card"><div className="stat-icon"><Clock3/></div><span>Tempo treinado</span><strong>{number.format(stats.totalMinutes / 60)} <i>h</i></strong><small>{filtered.length ? number.format(stats.totalMinutes / filtered.length) : 0} min em média</small></article>
        <article className="stat-card"><div className="stat-icon"><Trophy/></div><span>Exercícios</span><strong>{stats.exercises.length}</strong><small>diferentes no período</small></article>
      </section>
      {data && preferences.showInsights && <PersonalInsights data={data} prefs={preferences}/>} 
      <section className="analytics-grid">
        <article className="panel chart-panel"><div className="panel-head"><div><p className="eyebrow">DESEMPENHO</p><h2>Volume semanal</h2></div><span className="legend"><i/>Carga × repetições</span></div>{stats.chart.length > 1 ? <LineChart points={stats.chart}/> : <div className="empty">Mais treinos são necessários para formar o gráfico.</div>}</article>
        <article className="panel" id="exercicios"><div className="panel-head"><div><p className="eyebrow">FOCO</p><h2>Mais treinados</h2></div><span className="click-hint">Clique para analisar</span></div><div className="ranking">{stats.exercises.slice(0, 5).map(([name, x], i) => <button className="rank" key={name} onClick={() => setSelectedExercise(name)}><b>{String(i + 1).padStart(2, "0")}</b><div><strong>{name}</strong><span>{x.sets} séries · máx. {number.format(x.max)} kg</span></div><em>{compact.format(x.volume)} kg</em></button>)}{!stats.exercises.length && <div className="empty">Nenhum exercício no período.</div>}</div></article>
      </section>
      {data && preferences.showAdvanced && <DeepAnalytics data={data} workouts={filtered}/>} 
      {data && preferences.showCalendar && <WorkoutCalendar workouts={data.workouts} onOpenWorkout={id => { setExpanded(id); document.getElementById("historico")?.scrollIntoView({ behavior: "smooth" }); }}/>} 
      {preferences.showHistory && <section className="history" id="historico"><div className="section-head"><div><p className="eyebrow">ATIVIDADE</p><h2>Histórico de treinos</h2></div><label className="search"><Search/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar treino ou exercício"/></label></div>
        <div className="workout-list">{visibleWorkouts.slice(0, 30).map(w => <article className={`workout ${expanded === w.id ? "open" : ""}`} key={w.id}><button className="workout-main" onClick={() => setExpanded(expanded === w.id ? null : w.id)}><div className="date-box"><b>{new Date(w.start_time).getDate()}</b><span>{new Date(w.start_time).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</span></div><div className="workout-name"><strong>{w.title}</strong><span>{date.format(new Date(w.start_time))} · {number.format(durationOf(w))} min</span></div><div className="workout-metric"><b>{w.exercises.length}</b><span>exercícios</span></div><div className="workout-metric"><b>{setsOf(w)}</b><span>séries</span></div><div className="workout-metric volume"><b>{compact.format(volumeOf(w))} kg</b><span>volume</span></div><ChevronDown className="chevron"/></button><div className="workout-details">{w.exercises.map(e => <div className="exercise-row" key={`${w.id}-${e.index}`}><div><strong>{e.title}</strong><span>{e.sets.length} séries</span></div><div className="set-pills">{e.sets.map(s => <span key={s.index}>{s.weight_kg != null && `${number.format(s.weight_kg)}kg`}{s.weight_kg != null && s.reps != null && " × "}{s.reps != null && `${s.reps}`}{s.distance_meters != null && `${number.format(s.distance_meters)}m`}{s.duration_seconds != null && `${number.format(s.duration_seconds / 60)}min`}</span>)}</div></div>)}</div></article>)}{!visibleWorkouts.length && <div className="empty panel">Nenhum treino encontrado.</div>}</div>
      </section>}<footer><span><Activity/> Dados sincronizados com Hevy</span><span>Atualizado {data ? new Date(data.fetchedAt).toLocaleString("pt-BR") : "—"}</span></footer>
    </main>{selectedExercise && <ExerciseAnalysis name={selectedExercise} templateId={data?.exerciseTemplates.find(t => t.title === selectedExercise)?.id ?? data?.workouts.flatMap(w => w.exercises).find(e => e.title === selectedExercise)?.exercise_template_id} workouts={filtered} onClose={() => setSelectedExercise(null)}/>} {settingsOpen&&<SettingsPanel value={preferences} onChange={updatePreferences} onClose={()=>setSettingsOpen(false)}/>} 
  </div>;
}

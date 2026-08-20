"use client";

import Link from "next/link";
import { Bot, ChevronRight, ExternalLink, MessageCircle, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { DashboardPayload, HevyWorkout } from "@/lib/types";

type Screen = "dashboard" | "calendar" | "exercises" | "weight" | "coach" | "profile";
type Prompt = { id: string; label: string; answer: string };
const fmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const workoutVolume = (w: HevyWorkout) => w.exercises.reduce((a, e) => a + e.sets.reduce((b, s) => b + (s.weight_kg ?? 0) * (s.reps ?? 0), 0), 0);

export default function GlobalCoachChat({ active, athleteName }: { active: Screen; athleteName?: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [messages, setMessages] = useState<Array<{ role: "coach" | "athlete"; text: string }>>([]);
  const [typing, setTyping] = useState(false);
  useEffect(() => { fetch("/api/dashboard").then(r => r.ok ? r.json() : null).then(setData).catch(() => null); }, []);

  const context = useMemo(() => {
    if (!data) return null;
    const last7 = data.workouts.filter(w => Date.now() - +new Date(w.start_time) <= 7 * 864e5);
    const last30 = data.workouts.filter(w => Date.now() - +new Date(w.start_time) <= 30 * 864e5);
    const templates = new Map(data.exerciseTemplates.map(t => [t.id, t]));
    const muscles = new Map<string, number>();
    const exercises = new Map<string, { sessions: Set<string>; sets: number; max: number }>();
    last30.forEach(w => w.exercises.forEach(e => {
      const effective = e.sets.filter(s => s.type !== "warmup");
      const muscle = templates.get(e.exercise_template_id)?.primary_muscle_group ?? "outros";
      muscles.set(muscle, (muscles.get(muscle) ?? 0) + effective.length);
      const stat = exercises.get(e.title) ?? { sessions: new Set(), sets: 0, max: 0 };
      stat.sessions.add(w.id); stat.sets += effective.length; stat.max = Math.max(stat.max, ...effective.map(s => s.weight_kg ?? 0)); exercises.set(e.title, stat);
    }));
    const allSets = last30.flatMap(w => w.exercises.flatMap(e => e.sets)).filter(s => s.type !== "warmup");
    const weights = data.bodyMeasurements.filter(m => m.weight_kg != null);
    return {
      latest: data.workouts[0], last7, last30,
      topMuscle: [...muscles].sort((a, b) => b[1] - a[1])[0],
      lowMuscle: [...muscles].filter(x => x[1] > 0).sort((a, b) => a[1] - b[1])[0],
      topExercise: [...exercises].sort((a, b) => b[1].max - a[1].max)[0],
      rpe: allSets.length ? allSets.filter(s => s.rpe != null).length / allSets.length * 100 : 0,
      weightChange: weights.length > 1 ? weights.at(-1)!.weight_kg! - weights[0].weight_kg! : null,
    };
  }, [data]);

  const prompts = useMemo<Prompt[]>(() => {
    if (!context) return [{ id: "loading", label: "O que você está analisando?", answer: "Estou sincronizando seu histórico para liberar recomendações personalizadas." }];
    const c = context, muscle = (x?: string) => x?.replaceAll("_", " ") ?? "o grupo prioritário";
    const common: Prompt[] = [
      { id: "today", label: "O que devo treinar hoje?", answer: c.lowMuscle ? `Eu priorizaria ${muscle(c.lowMuscle[0])}: foi o menor estímulo recente, com ${c.lowMuscle[1]} séries. Dor e recuperação devem confirmar a decisão.` : "Preciso de mais treinos para indicar um grupo com confiança." },
      { id: "week", label: "Como está minha semana?", answer: `Você completou ${c.last7.length} treino${c.last7.length === 1 ? "" : "s"} em 7 dias. ${c.last7.length >= 5 ? "É uma semana densa; cuide da recuperação." : c.last7.length >= 3 ? "É uma frequência consistente." : "Há espaço para ganhar consistência."}` },
      { id: "balance", label: "Onde estou desequilibrado?", answer: c.topMuscle && c.lowMuscle ? `${muscle(c.topMuscle[0])} recebeu ${c.topMuscle[1]} séries contra ${c.lowMuscle[1]} de ${muscle(c.lowMuscle[0])}. Avalie essa diferença conforme seu objetivo.` : "Ainda não há dados suficientes para comparar grupos." },
      { id: "pr", label: "Qual exercício merece um PR?", answer: c.topExercise ? `${c.topExercise[0]} é um candidato: apareceu em ${c.topExercise[1].sessions.size} sessões e chegou a ${fmt.format(c.topExercise[1].max)} kg. Progrida somente com técnica limpa.` : "Ainda não identifiquei um candidato confiável." },
      { id: "rest", label: "Preciso descansar?", answer: c.last7.length >= 5 ? `Foram ${c.last7.length} sessões em 7 dias. Considere descanso ou recuperação ativa, principalmente se sono e disposição caíram.` : "A frequência não exige descanso por si só; sono, dores e disposição mandam nessa decisão." },
      { id: "rpe", label: "Meus dados estão completos?", answer: `A cobertura de RPE está em ${fmt.format(c.rpe)}%. ${c.rpe >= 70 ? "É uma base muito boa." : "Registre RPE nas séries principais para melhorar a leitura de fadiga."}` },
      { id: "volume", label: "Como está meu volume?", answer: c.latest ? `Seu treino mais recente teve ${fmt.format(workoutVolume(c.latest))} kg de volume calculado. Compare a tendência, não apenas uma sessão isolada.` : "Ainda não encontrei volume recente." },
      { id: "frequency", label: "Minha frequência está boa?", answer: `${c.last30.length} treinos em 30 dias representam aproximadamente ${fmt.format(c.last30.length / 4.3)} sessões por semana.` },
    ];
    const screen: Record<Screen, Prompt[]> = {
      dashboard: [{ id: "signal", label: "Qual o principal sinal agora?", answer: c.topMuscle ? `Seu foco dominante foi ${muscle(c.topMuscle[0])}, com ${c.topMuscle[1]} séries efetivas recentes.` : "Estou formando sua linha de base." }],
      calendar: [{ id: "next", label: "Quando devo treinar de novo?", answer: c.latest ? `Seu último treino foi em ${new Date(c.latest.start_time).toLocaleDateString("pt-BR")}. Use o intervalo junto da recuperação do grupo trabalhado.` : "Não encontrei o último treino." }, { id: "rhythm", label: "Qual meu ritmo no calendário?", answer: `Você registrou ${c.last30.length} sessões nos últimos 30 dias.` }],
      exercises: [{ id: "load", label: "Qual minha maior carga recente?", answer: c.topExercise ? `${c.topExercise[0]} lidera com ${fmt.format(c.topExercise[1].max)} kg.` : "Não há carga comparável." }, { id: "tracked", label: "Qual exercício está mais rastreado?", answer: c.topExercise ? `${c.topExercise[0]} soma ${c.topExercise[1].sets} séries em ${c.topExercise[1].sessions.size} sessões recentes.` : "Ainda não há recorrência suficiente." }],
      weight: [{ id: "weight-trend", label: "Meu ritmo de peso está adequado?", answer: c.weightChange == null ? "Registre pelo menos duas medições para eu separar tendência de oscilação." : `A variação total registrada é ${c.weightChange > 0 ? "+" : ""}${fmt.format(c.weightChange)} kg. Avalie essa tendência junto da força, recuperação e do objetivo configurado.` }, { id: "protect-strength", label: "Como proteger minha força?", answer: "Mantenha os movimentos principais, preserve séries efetivas e evite aumentar déficit e volume de treino ao mesmo tempo. Uma queda persistente de performance merece revisão do plano." }, { id: "weight-noise", label: "Como interpretar oscilações?", answer: "Compare medições feitas em condições parecidas e observe várias semanas. Hidratação, horário e alimentação podem mover um valor isolado sem representar mudança real." }],
      profile: [{ id: "body", label: "Como meu peso evoluiu?", answer: c.weightChange == null ? "Registre pelo menos duas medições para calcular a evolução." : `A variação desde a primeira medição foi ${c.weightChange > 0 ? "+" : ""}${fmt.format(c.weightChange)} kg.` }, { id: "profile-data", label: "Como melhorar meus dados?", answer: "Atualize medidas corporais e registre RPE nas séries principais. Isso melhora minhas leituras de evolução e recuperação." }],
      coach: [],
    };
    return [...screen[active], ...common];
  }, [active, context]);

  useEffect(() => { setMessages([{ role: "coach", text: `Olá, ${athleteName?.split(" ")[0] ?? "atleta"}. Estou usando o contexto desta tela. Escolha uma pergunta.` }]); }, [active, athleteName]);
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      const conversation = document.querySelector<HTMLElement>(".global-chat .conversation-window");
      conversation?.scrollTo({ top: conversation.scrollHeight, behavior: "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }, [messages, typing, open]);
  function ask(p: Prompt) { if (typing) return; setMessages(m => [...m, { role: "athlete", text: p.label }]); setTyping(true); setTimeout(() => { setMessages(m => [...m, { role: "coach", text: p.answer }]); setTyping(false); }, 420); }
  return <><button className={`coach-chat-head global ${open ? "open" : ""}`} onClick={() => setOpen(v => !v)} aria-label={open ? "Fechar Coach" : "Conversar com o Coach"}><span><Bot /><i /></span><div><b>Coach</b><small>{open ? "Conversa aberta" : `${prompts.length} perguntas para você`}</small></div>{open ? <X /> : <MessageCircle />}<em>{prompts.length}</em></button>{open && <aside className="coach-floating-chat global-chat"><header><div className="coach-avatar"><Bot /><i /></div><div><span>COACH CONTEXTUAL</span><strong>Leitura desta tela.</strong><small>As perguntas mudam conforme você navega.</small></div><button onClick={() => setOpen(false)} aria-label="Fechar conversa"><X /></button></header><div className="conversation-window">{messages.slice(-6).map((m, i) => <div className={`coach-message ${m.role}`} key={`${m.role}-${i}`}><span>{m.role === "coach" ? <Bot /> : athleteName?.[0] ?? "A"}</span><p>{m.text}</p></div>)}{typing && <div className="coach-message coach typing"><span><Bot /></span><p><i /><i /><i /></p></div>}</div><div className="conversation-suggestion-title"><Sparkles /> Perguntas sugeridas para esta tela</div><div className="conversation-prompts contextual">{prompts.map(p => <button key={p.id} disabled={typing} onClick={() => ask(p)}>{p.label}<ChevronRight /></button>)}</div><Link className="coach-center-link" href="/coach"><span><Sparkles /> Abrir central completa do Coach</span><ExternalLink /></Link></aside>}</>;
}

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Award,
  BatteryCharging,
  Bot,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Dumbbell,
  Flame,
  Gauge,
  Lightbulb,
  MessageCircle,
  Scale,
  Send,
  Sparkles,
  Target,
  TrendingDown,
  Zap,
  X,
} from "lucide-react";
import AppSidebar from "./AppSidebar";
import type { DashboardPayload, HevyWorkout } from "@/lib/types";

const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const compact = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const muscleNames: Record<string, string> = {
  chest: "Peito",
  shoulders: "Ombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  forearms: "Antebraços",
  abdominals: "Abdômen",
  quadriceps: "Quadríceps",
  adductors: "Adutores",
  calves: "Panturrilhas",
  traps: "Trapézio",
  upper_back: "Costas superiores",
  lats: "Dorsais",
  lower_back: "Lombar",
  glutes: "Glúteos",
  hamstrings: "Posteriores",
};
const trackedMuscles = Object.keys(muscleNames);
const volumeOf = (workout: HevyWorkout) =>
  workout.exercises
    .flatMap((exercise) => exercise.sets)
    .reduce((sum, set) => sum + (set.weight_kg ?? 0) * (set.reps ?? 0), 0);

export default function CoachPage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [chat, setChat] = useState<
    Array<{ role: "coach" | "athlete"; text: string }>
  >([]);
  const [question, setQuestion] = useState("");
  const [coachTyping, setCoachTyping] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  useEffect(() => {
    fetch("/api/dashboard")
      .then(async (response) => {
        if (response.status === 401) {
          location.href = "/";
          return null;
        }
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((value) => value && setData(value))
      .finally(() => setLoading(false));
  }, []);
  const coach = useMemo(() => {
    if (!data) return null;
    const now = Date.now();
    const templates = new Map(
      data.exerciseTemplates.map((template) => [template.id, template]),
    );
    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const muscles = new Map<
      string,
      {
        weeklySets: number;
        totalSets: number;
        volume: number;
        last: number | null;
      }
    >();
    const exerciseUsage = new Map<
      string,
      {
        title: string;
        muscle: string;
        sets: number;
        sessions: { date: number; best: number }[];
      }
    >();
    data.workouts.forEach((workout) => {
      const time = +new Date(workout.start_time);
      workout.exercises.forEach((exercise) => {
        const template = templates.get(exercise.exercise_template_id);
        if (!template) return;
        const valid = exercise.sets.filter((set) => set.type !== "warmup");
        const exerciseVolume = valid.reduce(
          (sum, set) => sum + (set.weight_kg ?? 0) * (set.reps ?? 0),
          0,
        );
        [
          template.primary_muscle_group,
          ...(template.secondary_muscle_groups ?? []),
        ].forEach((muscle, index) => {
          const current = muscles.get(muscle) ?? {
            weeklySets: 0,
            totalSets: 0,
            volume: 0,
            last: null,
          };
          const weight = index === 0 ? 1 : 0.5;
          if (time >= +weekStart) current.weeklySets += valid.length * weight;
          current.totalSets += valid.length * weight;
          current.volume += exerciseVolume * weight;
          current.last = Math.max(current.last ?? 0, time);
          muscles.set(muscle, current);
        });
        const current = exerciseUsage.get(exercise.title) ?? {
          title: exercise.title,
          muscle: template.primary_muscle_group,
          sets: 0,
          sessions: [],
        };
        current.sets += valid.length;
        current.sessions.push({
          date: time,
          best: Math.max(
            ...valid.map(
              (set) => (set.weight_kg ?? 0) * (1 + (set.reps ?? 0) / 30),
            ),
            0,
          ),
        });
        exerciseUsage.set(exercise.title, current);
      });
    });
    const muscleRows = trackedMuscles.map((name) => {
      const value = muscles.get(name) ?? {
        weeklySets: 0,
        totalSets: 0,
        volume: 0,
        last: null,
      };
      const hours = value.last ? (now - value.last) / 3600000 : Infinity;
      const status =
        value.weeklySets >= 4 && hours <= 48
          ? "fatigued"
          : value.weeklySets > 0
            ? "trained"
            : "ready";
      return {
        name,
        ...value,
        hours,
        days: Number.isFinite(hours) ? hours / 24 : 999,
        status,
      };
    });
    const ready = muscleRows
      .filter((row) => row.status === "ready")
      .sort((a, b) => b.days - a.days);
    const fatigued = muscleRows.filter((row) => row.status === "fatigued");
    const targets = ready.slice(0, 3);
    const suggestions = [...exerciseUsage.values()]
      .filter((exercise) =>
        targets.some((target) => target.name === exercise.muscle),
      )
      .sort((a, b) => b.sets - a.sets)
      .slice(0, 5);
    const readiness = Math.round(
      Math.max(
        0,
        Math.min(
          100,
          100 - fatigued.length * 9 - Math.max(0, 3 - ready.length) * 4,
        ),
      ),
    );
    const trends = [...exerciseUsage.values()]
      .map((exercise) => {
        const sessions = exercise.sessions
          .sort((a, b) => a.date - b.date)
          .filter((session) => session.best > 0);
        const recent = sessions.slice(-3);
        const previous = sessions.slice(-6, -3);
        const average = (items: typeof sessions) =>
          items.length
            ? items.reduce((sum, item) => sum + item.best, 0) / items.length
            : 0;
        const change =
          previous.length && average(previous)
            ? (average(recent) / average(previous) - 1) * 100
            : null;
        const allTime = Math.max(...sessions.map((session) => session.best), 0);
        const latest = sessions.at(-1)?.best ?? 0;
        return {
          ...exercise,
          sessions,
          change,
          allTime,
          latest,
          prProximity: allTime ? (latest / allTime) * 100 : 0,
        };
      })
      .filter((exercise) => exercise.sessions.length >= 3);
    const plateaus = trends
      .filter(
        (exercise) =>
          exercise.change != null &&
          Math.abs(exercise.change) < 2 &&
          exercise.sessions.length >= 6,
      )
      .sort((a, b) => b.sessions.length - a.sessions.length)
      .slice(0, 4);
    const declining = trends
      .filter((exercise) => exercise.change != null && exercise.change < -3)
      .sort((a, b) => (a.change ?? 0) - (b.change ?? 0))
      .slice(0, 3);
    const prRadar = trends
      .filter((exercise) => exercise.prProximity >= 94)
      .sort((a, b) => b.prProximity - a.prProximity)
      .slice(0, 4);
    const pairs = [
      ["chest", "upper_back", "Peito", "Costas"],
      ["quadriceps", "hamstrings", "Quadríceps", "Posteriores"],
      ["biceps", "triceps", "Bíceps", "Tríceps"],
    ] as const;
    const balance = pairs.map(([a, b, labelA, labelB]) => {
      const av = muscles.get(a)?.volume ?? 0,
        bv = muscles.get(b)?.volume ?? 0;
      const ratio = Math.max(av, bv)
        ? (Math.min(av, bv) / Math.max(av, bv)) * 100
        : 100;
      return { labelA, labelB, av, bv, ratio, weak: av < bv ? labelA : labelB };
    });
    const last7 = data.workouts.filter(
      (workout) => +new Date(workout.start_time) >= now - 7 * 86400000,
    );
    const previous7 = data.workouts.filter((workout) => {
      const time = +new Date(workout.start_time);
      return time < now - 7 * 86400000 && time >= now - 14 * 86400000;
    });
    const weeklyVolume = last7.reduce(
      (sum, workout) => sum + volumeOf(workout),
      0,
    );
    const previousVolume = previous7.reduce(
      (sum, workout) => sum + volumeOf(workout),
      0,
    );
    const volumeChange = previousVolume
      ? (weeklyVolume / previousVolume - 1) * 100
      : null;
    const allSets = data.workouts.flatMap((workout) =>
      workout.exercises.flatMap((exercise) =>
        exercise.sets.filter((set) => set.type !== "warmup"),
      ),
    );
    const rpeCoverage = allSets.length
      ? (allSets.filter((set) => set.rpe != null).length / allSets.length) * 100
      : 0;
    const routineAdherence = data.workouts.length
      ? (data.workouts.filter((workout) => workout.routine_id).length /
          data.workouts.length) *
        100
      : 0;
    const last7Minutes = last7.reduce(
      (sum, workout) =>
        sum +
        Math.max(
          0,
          (+new Date(workout.end_time) - +new Date(workout.start_time)) / 60000,
        ),
      0,
    );
    const density = last7Minutes ? weeklyVolume / last7Minutes : 0;
    const templateCoverage = data.workouts.flatMap(
      (workout) => workout.exercises,
    ).length
      ? (data.workouts
          .flatMap((workout) => workout.exercises)
          .filter((exercise) => templates.has(exercise.exercise_template_id))
          .length /
          data.workouts.flatMap((workout) => workout.exercises).length) *
        100
      : 0;
    const dataConfidence = Math.round(
      Math.min(
        100,
        templateCoverage * 0.55 +
          Math.min(100, allSets.length / 5) * 0.25 +
          rpeCoverage * 0.2,
      ),
    );
    const weeklyLoad = Array.from({ length: 6 }, (_, index) => {
      const weeksAgo = 5 - index;
      const end = now - weeksAgo * 7 * 86400000;
      const start = end - 7 * 86400000;
      const workouts = data.workouts.filter((workout) => {
        const time = +new Date(workout.start_time);
        return time >= start && time < end;
      });
      return {
        label: weeksAgo ? `-${weeksAgo} sem` : "Atual",
        volume: workouts.reduce((sum, workout) => sum + volumeOf(workout), 0),
        workouts: workouts.length,
      };
    });
    const maxWeeklyLoad = Math.max(...weeklyLoad.map((week) => week.volume), 1);
    const recentFour = weeklyLoad.slice(-4);
    const activeWeeks = recentFour.filter((week) => week.workouts > 0).length;
    const consistency = Math.round((activeWeeks / Math.max(1, recentFour.length)) * 100);
    const averageDuration = last7.length ? last7Minutes / last7.length : 0;
    const recentMuscles = new Set<string>();
    last7.forEach((workout) => workout.exercises.forEach((exercise) => {
      const template = templates.get(exercise.exercise_template_id);
      if (template?.primary_muscle_group) recentMuscles.add(template.primary_muscle_group);
    }));
    const orderedDates = [...new Set(data.workouts.slice(0, 30).map((workout) => new Date(workout.start_time).setHours(12, 0, 0, 0)))].sort((a,b) => b-a);
    const longestRecentGap = orderedDates.slice(0,-1).reduce((best, day, index) => Math.max(best, (day - orderedDates[index+1]) / 86400000), 0);
    const actions = [
      ...(targets[0]
        ? [
            {
              type: "Treino",
              title: `Estimule ${muscleNames[targets[0].name]}`,
              detail:
                targets[0].days > 90
                  ? "Grupo sem registro recente"
                  : `${Math.floor(targets[0].days)} dias desde o último estímulo`,
              tone: "lime",
            },
          ]
        : []),
      ...(declining[0]
        ? [
            {
              type: "Recuperação",
              title: `Revise ${declining[0].title}`,
              detail: `Queda recente de ${number.format(Math.abs(declining[0].change ?? 0))}%`,
              tone: "red",
            },
          ]
        : []),
      ...(plateaus[0]
        ? [
            {
              type: "Progressão",
              title: `Destrave ${plateaus[0].title}`,
              detail: "Tente +1 repetição ou o menor incremento de carga",
              tone: "amber",
            },
          ]
        : []),
    ];
    return {
      muscleRows,
      ready,
      fatigued,
      targets,
      suggestions,
      readiness,
      plateaus,
      declining,
      prRadar,
      balance,
      last7,
      weeklyVolume,
      volumeChange,
      weeklyLoad,
      maxWeeklyLoad,
      actions,
      rhythm: { consistency, activeWeeks, averageDuration, muscleCoverage: recentMuscles.size, longestRecentGap },
      quality: { rpeCoverage, routineAdherence, density, dataConfidence },
    };
  }, [data]);
  useEffect(() => {
    if (coach && !chat.length)
      setChat([
        {
          role: "coach",
          text: `Bom dia, ${data?.user?.name?.split(" ")[0] ?? "atleta"}. Analisei seus treinos: sua prontid\u00e3o est\u00e1 em ${coach.readiness}/100. Quer decidir o treino de hoje comigo?`,
        },
      ]);
  }, [coach, data, chat.length]);
  if (loading || !data || !coach)
    return (
      <main className="center-state coach-loading">
        <div className="loader" />
        <p>Seu Coach está analisando o histórico…</p>
      </main>
    );
  const recommendation = coach.targets.length
    ? `Priorize ${coach.targets.map((target) => muscleNames[target.name]).join(", ")}. Esses grupos estão recuperados e são os que estão há mais tempo sem estímulo.`
    : "Semana equilibrada. Considere recuperação ativa ou repetir o grupo com menor volume.";
  function coachAnswer(input: string) {
    if (!coach) return "Ainda estou analisando seus dados.";
    const normalized = input.toLowerCase();
    if (normalized.includes("pr") || normalized.includes("record"))
      return coach.prRadar.length
        ? `Você tem ${coach.prRadar.length} boas oportunidades. Eu começaria por ${coach.prRadar[0].title}, que está em ${number.format(coach.prRadar[0].prProximity)}% do melhor 1RM estimado. Aqueça bem e só avance se a execução estiver limpa.`
        : "Ainda não encontrei uma oportunidade de PR confiável. Mantenha a progressão gradual por mais algumas sessões.";
    if (
      normalized.includes("deload") ||
      normalized.includes("descans") ||
      normalized.includes("cansad")
    )
      return coach.fatigued.length >= 6 || coach.declining.length >= 3
        ? `Eu consideraria reduzir o volume por uma sessão. Há ${coach.fatigued.length} grupos em recuperação e ${coach.declining.length} exercícios com queda recente. Preserve a técnica e corte de 20% a 30% das séries.`
        : "Se você está se sentindo bem, os dados não exigem deload agora. Ainda assim, dor, sono e motivação valem mais que o algoritmo.";
    if (normalized.includes("equil") || normalized.includes("fraco")) {
      const pair = [...coach.balance].sort((a, b) => a.ratio - b.ratio)[0];
      return `Seu maior desequilíbrio aparece entre ${pair.labelA} e ${pair.labelB}: ${number.format(pair.ratio)}% de equilíbrio. Eu aumentaria gradualmente o estímulo de ${pair.weak}.`;
    }
    if (normalized.includes("plat"))
      return coach.plateaus.length
        ? `${coach.plateaus[0].title} é o platô mais claro. Na próxima sessão, tente apenas uma mudança: +1 repetição na primeira série efetiva ou o menor incremento disponível de carga.`
        : "Não há platôs consistentes neste momento.";
    if (normalized.includes("hoje") || normalized.includes("trein"))
      return `${recommendation} Eu montaria a sessão começando por ${
        coach.suggestions
          .slice(0, 3)
          .map((exercise) => exercise.title)
          .join(", ") || "movimentos que você executa com segurança"
      }.`;
    if (normalized.includes("rpe"))
      return `Sua cobertura de RPE está em ${number.format(coach.quality.rpeCoverage)}%. Registrar o esforço nas séries principais vai melhorar muito minha leitura de fadiga.`;
    return `O sinal mais importante agora é este: ${recommendation} Se me perguntar sobre treino, PR, deload, equilíbrio, platô ou RPE, consigo ser mais específico.`;
  }
  function askCoach(text: string) {
    const clean = text.trim();
    if (!clean || coachTyping) return;
    setChat((current) => [...current, { role: "athlete", text: clean }]);
    setCoachTyping(true);
    window.setTimeout(() => {
      setChat((current) => [
        ...current,
        { role: "coach", text: coachAnswer(clean) },
      ]);
      setCoachTyping(false);
    }, 520);
  }
  return (
    <div className="app-shell">
      <AppSidebar
        active="coach"
        user={data.user}
        workoutCount={data.workoutCount}
      />
      <main className="content coach-page">
        <header className="coach-header">
          <div>
            <p className="eyebrow">INTELIGÊNCIA DE TREINO</p>
            <h1>Seu Coach.</h1>
            <p className="subtitle">
              Leitura prática do seu histórico para decidir o próximo estímulo.
            </p>
          </div>
          <span className="coach-live">
            <i />
            <Sparkles /> Atualizado agora
          </span>
        </header>
        <section className="coach-hero">
          <div className="coach-ambient" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <div
            className="coach-orb"
            style={
              {
                "--score": `${coach.readiness * 3.6}deg`,
              } as React.CSSProperties
            }
          >
            <div>
              <strong>{coach.readiness}</strong>
              <span>PRONTIDÃO</span>
            </div>
          </div>
          <div className="coach-hero-copy">
            <span className="coach-kicker">
              <BrainCircuit /> RECOMENDAÇÃO DO DIA
            </span>
            <h2>
              {coach.readiness >= 75
                ? "Você está pronto para um treino produtivo."
                : "Recupere antes de buscar performance máxima."}
            </h2>
            <p>{recommendation}</p>
            <div className="coach-targets">
              {coach.targets.map((target) => (
                <span key={target.name}>
                  <Target />
                  {muscleNames[target.name]}
                  <small>
                    {target.days > 90
                      ? "sem registro"
                      : `${Math.floor(target.days)} dias sem estímulo`}
                  </small>
                </span>
              ))}
            </div>
          </div>
          <div className="coach-hero-status">
            <article>
              <BatteryCharging />
              <span>Recuperados</span>
              <strong>{coach.ready.length}</strong>
            </article>
            <article>
              <Flame />
              <span>Em recuperação</span>
              <strong>{coach.fatigued.length}</strong>
            </article>
            <article>
              <Dumbbell />
              <span>Treinos em 7 dias</span>
              <strong>{coach.last7.length}</strong>
            </article>
          </div>
        </section>
        <section className="coach-conversation legacy-conversation">
          <div className="conversation-persona">
            <div className="coach-avatar">
              <Bot />
              <i />
            </div>
            <div>
              <span>COACH ONLINE</span>
              <h2>Converse sobre seu treino.</h2>
              <p>Respostas calculadas com seu histórico atual.</p>
            </div>
            <MessageCircle />
          </div>
          <div className="conversation-window">
            {chat.slice(-4).map((message, index) => (
              <div
                className={`coach-message ${message.role}`}
                key={`${message.role}-${index}`}
              >
                <span>
                  {message.role === "coach" ? (
                    <Bot />
                  ) : (
                    (data.user?.name?.[0] ?? "A")
                  )}
                </span>
                <p>{message.text}</p>
              </div>
            ))}
            {coachTyping && (
              <div className="coach-message coach typing">
                <span>
                  <Bot />
                </span>
                <p>
                  <i />
                  <i />
                  <i />
                </p>
              </div>
            )}
          </div>
          <div className="conversation-prompts">
            {[
              "O que treino hoje?",
              "Posso buscar um PR?",
              "Preciso de deload?",
              "Onde estou desequilibrado?",
            ].map((prompt) => (
              <button key={prompt} onClick={() => askCoach(prompt)}>
                {prompt}
              </button>
            ))}
          </div>
          <form
            className="coach-chat-form"
            onSubmit={(event) => {
              event.preventDefault();
              askCoach(question);
            }}
          >
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Pergunte sobre treino, PR, fadiga, platô ou RPE…"
              aria-label="Perguntar ao Coach"
            />
            <button
              disabled={!question.trim() || coachTyping}
              aria-label="Enviar pergunta"
            >
              <Send />
            </button>
          </form>
        </section>
        <button className={`coach-chat-head ${chatOpen ? "open" : ""}`} onClick={() => setChatOpen((value) => !value)} aria-label={chatOpen ? "Fechar Coach" : "Conversar com o Coach"}><span><Bot /><i /></span><div><b>Coach</b><small>{chatOpen ? "Conversa aberta" : "Tenho uma leitura para você"}</small></div>{chatOpen ? <X /> : <MessageCircle />}<em>1</em></button>
        {chatOpen && <aside className="coach-floating-chat"><header><div className="coach-avatar"><Bot /><i /></div><div><span>COACH ONLINE</span><strong>Vamos decidir juntos.</strong><small>Escolha uma pergunta para começar.</small></div><button onClick={() => setChatOpen(false)} aria-label="Fechar conversa"><X /></button></header><div className="conversation-window">{chat.slice(-6).map((message, index) => <div className={`coach-message ${message.role}`} key={`${message.role}-${index}`}><span>{message.role === "coach" ? <Bot /> : (data.user?.name?.[0] ?? "A")}</span><p>{message.text}</p></div>)}{coachTyping && <div className="coach-message coach typing"><span><Bot /></span><p><i /><i /><i /></p></div>}</div><div className="conversation-suggestion-title"><Sparkles /> O que você quer saber?</div><div className="conversation-prompts">{["O que treino hoje?", "Posso buscar um PR?", "Preciso de deload?", "Onde estou desequilibrado?", "Tenho algum platô?", "Como melhorar a análise com RPE?"].map((prompt) => <button key={prompt} disabled={coachTyping} onClick={() => askCoach(prompt)}>{prompt}<ChevronRight /></button>)}</div></aside>}
        <section className="coach-action-strip">
          <div className="action-strip-title">
            <Sparkles />
            <span>PLANO DE AÇÃO</span>
            <strong>As 3 decisões com maior impacto agora</strong>
          </div>
          {coach.actions.map((action, index) => (
            <article
              className={`coach-action ${action.tone}`}
              key={action.title}
              style={{ "--delay": `${index * 90}ms` } as React.CSSProperties}
            >
              <b>{String(index + 1).padStart(2, "0")}</b>
              <div>
                <span>{action.type}</span>
                <strong>{action.title}</strong>
                <small>{action.detail}</small>
              </div>
              <ArrowRight />
            </article>
          ))}
        </section>
        <section className="coach-quality-bar">
          <div className="quality-intro">
            <Gauge />
            <span>
              <b>QUALIDADE DA ANÁLISE</b>
              <strong>{coach.quality.dataConfidence}% de confiança</strong>
            </span>
          </div>
          <div>
            <span>Densidade recente</span>
            <strong>{number.format(coach.quality.density)} kg/min</strong>
            <small>volume por minuto treinado</small>
          </div>
          <div>
            <span>Uso de rotinas</span>
            <strong>{number.format(coach.quality.routineAdherence)}%</strong>
            <small>sessões com rotina vinculada</small>
          </div>
          <div>
            <span>Cobertura de RPE</span>
            <strong>{number.format(coach.quality.rpeCoverage)}%</strong>
            <small>séries com esforço informado</small>
          </div>
        </section>
        <section className="coach-rhythm">
          <div className="coach-rhythm-intro"><BrainCircuit /><div><p className="eyebrow">RITMO DO ATLETA</p><h2>Consistência também é performance.</h2><p>{coach.rhythm.consistency >= 75 ? "Você vem protegendo a rotina. O próximo ganho é manter a qualidade das sessões." : "Seu maior potencial agora está em reduzir as pausas longas e tornar o treino previsível."}</p></div></div>
          <div className="coach-rhythm-metrics">
            <article><span>Regularidade</span><strong>{coach.rhythm.consistency}%</strong><small>{coach.rhythm.activeWeeks}/4 semanas ativas</small></article>
            <article><span>Sessão média</span><strong>{number.format(coach.rhythm.averageDuration)} min</strong><small>últimos sete dias</small></article>
            <article><span>Cobertura muscular</span><strong>{coach.rhythm.muscleCoverage}/{trackedMuscles.length}</strong><small>grupos na semana</small></article>
            <article><span>Maior pausa recente</span><strong>{number.format(coach.rhythm.longestRecentGap)} dias</strong><small>últimos 30 treinos</small></article>
          </div>
        </section>
        <section className="coach-grid coach-primary">
          <article className="coach-panel next-workout">
            <div className="coach-panel-head">
              <div>
                <p className="eyebrow">PRÓXIMA SESSÃO</p>
                <h2>Movimentos recomendados</h2>
              </div>
              <Zap />
            </div>
            <p>
              Baseado nos grupos recuperados e nos exercícios que você mais
              utiliza.
            </p>
            <div className="coach-exercise-list">
              {coach.suggestions.map((exercise, index) => (
                <div key={exercise.title}>
                  <b>{String(index + 1).padStart(2, "0")}</b>
                  <span>
                    <strong>{exercise.title}</strong>
                    <small>
                      {muscleNames[exercise.muscle] ?? exercise.muscle} ·{" "}
                      {exercise.sets} séries históricas
                    </small>
                  </span>
                  <ChevronRight />
                </div>
              ))}
              {!coach.suggestions.length && (
                <div className="coach-empty">
                  Registre mais exercícios para gerar a sessão sugerida.
                </div>
              )}
            </div>
          </article>
          <article className="coach-panel forgotten">
            <div className="coach-panel-head">
              <div>
                <p className="eyebrow">ATENÇÃO</p>
                <h2>Grupos esquecidos</h2>
              </div>
              <CalendarClock />
            </div>
            <div className="forgotten-list">
              {coach.ready.slice(0, 6).map((row, index) => (
                <div key={row.name}>
                  <span>
                    <i style={{ opacity: 1 - index * 0.1 }} />
                    <strong>{muscleNames[row.name]}</strong>
                  </span>
                  <b>
                    {row.days > 90
                      ? "Sem histórico"
                      : `${Math.floor(row.days)} dias`}
                  </b>
                </div>
              ))}
            </div>
          </article>
        </section>
        <section className="coach-grid coach-intelligence">
          <article className="coach-panel recovery-matrix">
            <div className="coach-panel-head">
              <div>
                <p className="eyebrow">RECUPERAÇÃO COMPLETA</p>
                <h2>Matriz dos grupos musculares</h2>
              </div>
              <BatteryCharging />
            </div>
            <p>Passe pela lista antes de montar sua próxima sessão.</p>
            <div className="recovery-matrix-grid">
              {coach.muscleRows.map((row) => (
                <div className={row.status} key={row.name}>
                  <i />
                  <span>
                    <strong>{muscleNames[row.name]}</strong>
                    <small>
                      {row.status === "fatigued"
                        ? "Possível fadiga"
                        : row.status === "trained"
                          ? "Treinado na semana"
                          : row.days > 90
                            ? "Sem histórico recente"
                            : `${Math.floor(row.days)} dias sem estímulo`}
                    </small>
                  </span>
                  <b>{number.format(row.weeklySets)}</b>
                </div>
              ))}
            </div>
          </article>
          <article className="coach-panel load-evolution">
            <div className="coach-panel-head">
              <div>
                <p className="eyebrow">CARGA DE TREINO</p>
                <h2>Últimas 6 semanas</h2>
              </div>
              <Activity />
            </div>
            <p>Volume total e frequência para evitar picos bruscos.</p>
            <div className="load-bars">
              {coach.weeklyLoad.map((week, index) => (
                <div key={week.label}>
                  <span>
                    <i
                      style={{
                        height: `${Math.max(5, (week.volume / coach.maxWeeklyLoad) * 100)}%`,
                        animationDelay: `${index * 90}ms`,
                      }}
                    />
                  </span>
                  <b>{compact.format(week.volume)}</b>
                  <small>{week.label}</small>
                </div>
              ))}
            </div>
            <div className="load-guidance">
              <Gauge />
              <span>
                <strong>
                  {coach.volumeChange != null &&
                  Math.abs(coach.volumeChange) > 35
                    ? "Variação semanal elevada"
                    : "Carga dentro do padrão recente"}
                </strong>
                <small>
                  {coach.volumeChange == null
                    ? "Continue registrando para formar uma referência."
                    : `Variação de ${number.format(coach.volumeChange)}% contra a semana anterior.`}
                </small>
              </span>
            </div>
          </article>
        </section>
        <section className="coach-section">
          <div className="section-head">
            <div>
              <p className="eyebrow">PERFORMANCE</p>
              <h2>Diagnóstico dos exercícios</h2>
            </div>
            <span className="coach-caption">
              Força estimada pelas séries registradas
            </span>
          </div>
          <div className="coach-diagnostics">
            <article className="coach-panel">
              <div className="diagnostic-title plateau">
                <Gauge />
                <div>
                  <span>PLATÔS DETECTADOS</span>
                  <strong>{coach.plateaus.length}</strong>
                </div>
              </div>
              {coach.plateaus.map((exercise) => (
                <div className="diagnostic-row" key={exercise.title}>
                  <span>
                    <strong>{exercise.title}</strong>
                    <small>{exercise.sessions.length} sessões analisadas</small>
                  </span>
                  <b>Estável</b>
                </div>
              ))}
              {!coach.plateaus.length && (
                <div className="coach-positive">
                  <CheckCircle2 /> Nenhum platô confiável detectado.
                </div>
              )}
            </article>
            <article className="coach-panel">
              <div className="diagnostic-title decline">
                <TrendingDown />
                <div>
                  <span>QUEDA RECENTE</span>
                  <strong>{coach.declining.length}</strong>
                </div>
              </div>
              {coach.declining.map((exercise) => (
                <div className="diagnostic-row" key={exercise.title}>
                  <span>
                    <strong>{exercise.title}</strong>
                    <small>Últimas sessões</small>
                  </span>
                  <b>{number.format(exercise.change ?? 0)}%</b>
                </div>
              ))}
              {!coach.declining.length && (
                <div className="coach-positive">
                  <CheckCircle2 /> Performance recente sem quedas relevantes.
                </div>
              )}
            </article>
            <article className="coach-panel pr-radar">
              <div className="diagnostic-title pr">
                <Award />
                <div>
                  <span>RADAR DE PR</span>
                  <strong>{coach.prRadar.length}</strong>
                </div>
              </div>
              {coach.prRadar.map((exercise) => (
                <div className="diagnostic-row" key={exercise.title}>
                  <span>
                    <strong>{exercise.title}</strong>
                    <small>
                      {number.format(exercise.latest)} kg de 1RM estimado
                    </small>
                  </span>
                  <b>{number.format(exercise.prProximity)}%</b>
                </div>
              ))}
              {!coach.prRadar.length && (
                <div className="coach-positive">
                  <Lightbulb /> Continue progredindo para entrar no radar.
                </div>
              )}
            </article>
          </div>
        </section>
        <section className="coach-grid lower">
          <article className="coach-panel balance-panel">
            <div className="coach-panel-head">
              <div>
                <p className="eyebrow">EQUILÍBRIO</p>
                <h2>Relações musculares</h2>
              </div>
              <Scale />
            </div>
            <div className="balance-list">
              {coach.balance.map((pair) => (
                <div key={pair.labelA}>
                  <div>
                    <span>{pair.labelA}</span>
                    <b>{number.format(pair.ratio)}% equilibrado</b>
                    <span>{pair.labelB}</span>
                  </div>
                  <div className="balance-track">
                    <i
                      style={{
                        left: `${Math.max(4, Math.min(96, (pair.av / Math.max(pair.av + pair.bv, 1)) * 100))}%`,
                      }}
                    />
                  </div>
                  <small>
                    {pair.ratio < 70
                      ? `Aumente o estímulo de ${pair.weak}.`
                      : "Distribuição dentro de uma faixa saudável."}
                  </small>
                </div>
              ))}
            </div>
          </article>
          <article className="coach-panel weekly-report">
            <div className="coach-panel-head">
              <div>
                <p className="eyebrow">RELATÓRIO AUTOMÁTICO</p>
                <h2>Sua semana em uma leitura</h2>
              </div>
              <Activity />
            </div>
            <div className="weekly-score">
              <strong>{coach.last7.length}</strong>
              <span>
                treinos
                <br />
                concluídos
              </span>
              <b
                className={
                  (coach.volumeChange ?? 0) >= 0 ? "positive" : "negative"
                }
              >
                {coach.volumeChange == null
                  ? "Primeira leitura"
                  : `${coach.volumeChange >= 0 ? "+" : ""}${number.format(coach.volumeChange)}% volume`}
              </b>
            </div>
            <p>
              Você movimentou{" "}
              <strong>{compact.format(coach.weeklyVolume)} kg</strong> nos
              últimos sete dias.{" "}
              {coach.fatigued.length
                ? `${coach.fatigued.length} grupos ainda podem estar sob fadiga.`
                : "Todos os grupos treinados já passaram da janela principal de fadiga."}
            </p>
            <div className="report-insight">
              <Sparkles />
              <span>
                {coach.plateaus.length
                  ? `Há ${coach.plateaus.length} exercícios estáveis há várias sessões. Progrida uma variável por vez: carga, repetição ou execução.`
                  : "Sua progressão não apresenta platôs consistentes neste momento."}
              </span>
            </div>
          </article>
        </section>
        <footer>
          <span>
            <Sparkles /> Recomendações calculadas localmente com seus dados Hevy
          </span>
          <span>
            Atualizado {new Date(data.fetchedAt).toLocaleString("pt-BR")}
          </span>
        </footer>
      </main>
    </div>
  );
}

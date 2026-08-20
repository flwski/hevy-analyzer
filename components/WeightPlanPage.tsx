"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, CalendarClock, Check, ChevronRight, Dumbbell, Gauge, Scale, Settings2, Sparkles, Target, TrendingDown } from "lucide-react";
import AppSidebar from "./AppSidebar";
import type { DashboardPayload } from "@/lib/types";

const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const date = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
type Preferences = { targetWeight: number | null; weeklyGoal: number };

export default function WeightPlanPage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState<number | null>(null);
  useEffect(() => {
    Promise.all([fetch("/api/dashboard"), fetch("/api/preferences")]).then(async ([dashboard, prefs]) => {
      if (dashboard.status === 401) { location.href = "/"; return; }
      if (!dashboard.ok) throw new Error();
      const dashboardData = await dashboard.json();
      const preferenceData = prefs.ok ? await prefs.json() : null;
      setData(dashboardData);
      setPreferences(preferenceData?.preferences ?? { targetWeight: null, weeklyGoal: 5 });
    }).finally(() => setLoading(false));
  }, []);
  const plan = useMemo(() => {
    if (!data || !preferences) return null;
    const points = data.bodyMeasurements.filter(item => item.weight_kg != null).map(item => ({ value: item.weight_kg!, date: new Date(`${item.date}T12:00:00`), label: date.format(new Date(`${item.date}T12:00:00`)) })).slice(-36);
    const target = preferences.targetWeight;
    const start = points[0]?.value ?? null, current = points.at(-1)?.value ?? null;
    const direction = target != null && start != null ? Math.sign(target - start) : 0;
    const total = target != null && start != null ? Math.abs(target - start) : 0;
    const covered = current != null && start != null ? Math.max(0, Math.min(total, direction * (current - start))) : 0;
    const progress = total ? Math.min(100, covered / total * 100) : target != null && current === target ? 100 : 0;
    const remaining = target != null && current != null ? Math.abs(target-current) : null;
    const recent = points.slice(-6);
    const weeks = recent.length > 1 ? Math.max(.14,(+recent.at(-1)!.date-+recent[0].date)/604800000) : 0;
    const rate = weeks ? (recent.at(-1)!.value-recent[0].value)/weeks : 0;
    const onTrack = direction !== 0 && rate*direction > .02;
    const etaWeeks = onTrack && remaining != null ? Math.ceil(remaining/Math.abs(rate)) : null;
    const etaDate = etaWeeks != null && etaWeeks <= 104 ? new Date(Date.now()+etaWeeks*604800000) : null;
    const last28 = data.workouts.filter(workout => +new Date(workout.start_time) >= Date.now()-28*86400000);
    const activeWeeks = new Set(last28.map(workout => { const d=new Date(workout.start_time); const sunday=new Date(d); sunday.setDate(d.getDate()-d.getDay()); return sunday.toISOString().slice(0,10); })).size;
    const avgFrequency = last28.length/4;
    const strengthSets = last28.flatMap(workout=>workout.exercises.flatMap(exercise=>exercise.sets)).filter(set=>(set.weight_kg??0)>0 && (set.reps??0)>0);
    const measurementGap = points.length > 1 ? (+points.at(-1)!.date-+points.at(-2)!.date)/86400000 : null;
    const milestones = [25,50,75,100].map(percent => ({ percent, value: start != null && target != null ? start+(target-start)*(percent/100) : null, complete: progress>=percent }));
    const values = points.map(point=>point.value).concat(target == null ? [] : [target]);
    const min=values.length ? Math.min(...values) : 0, max=values.length ? Math.max(...values) : 1, padding=Math.max(1.5,(max-min)*.2), low=min-padding, high=max+padding;
    const y=(value:number)=>91-((value-low)/Math.max(1,high-low))*76;
    const path=points.map((point,index)=>`${index?"L":"M"} ${(index*100)/Math.max(1,points.length-1)} ${y(point.value)}`).join(" ");
    const motivation = progress >= 100 ? "Você concluiu o caminho planejado. Agora transforme o resultado em manutenção sustentável." : onTrack && progress >= 60 ? "A parte mais longa já ficou para trás. Seu trabalho agora é não trocar consistência por pressa." : onTrack ? "Sua tendência aponta para a meta. Continue repetindo semanas boas, não dias perfeitos." : "Oscilação não é fracasso. Retome o ritmo, registre a próxima medição e deixe a tendência falar.";
    return { points,target,start,current,direction,total,progress,remaining,rate,onTrack,etaWeeks,etaDate,activeWeeks,avgFrequency,strengthSets:strengthSets.length,measurementGap,milestones,y,path,motivation,weeklyGoal:preferences.weeklyGoal };
  }, [data,preferences]);
  if (loading || !data || !preferences || !plan) return <main className="center-state"><div className="loader"/><p>Construindo seu plano de peso…</p></main>;
  const active = hovered == null ? null : plan.points[hovered];
  const activeX = hovered == null ? 0 : hovered*100/Math.max(1,plan.points.length-1);
  if (plan.target == null) return <div className="app-shell"><AppSidebar active="weight" user={data.user} workoutCount={data.workoutCount}/><main className="content weight-plan-page"><header><div><p className="eyebrow">PLANO DE PESO</p><h1>Defina o destino para visualizar o caminho.</h1><p className="subtitle">Sua meta de peso ainda não foi configurada.</p></div></header><section className="weight-plan-no-target"><Target/><h2>Escolha um peso-alvo nas configurações da dashboard.</h2><p>Depois disso, esta tela calculará progresso, ritmo, previsão, marcos e orientações de treino.</p><a href="/">Abrir configurações <ChevronRight/></a></section></main></div>;
  const loss = plan.direction < 0;
  return <div className="app-shell"><AppSidebar active="weight" user={data.user} workoutCount={data.workoutCount}/><main className="content weight-plan-page">
    <header className="weight-plan-header"><div><p className="eyebrow">PLANO DE PESO</p><h1>{loss ? "Sua jornada de redução." : "Sua jornada de evolução corporal."}</h1><p className="subtitle">Tendência, treino e consistência convertidos em um plano que você consegue acompanhar.</p></div><a href="/"><Settings2/> Ajustar meta</a></header>
    <section className="weight-plan-hero">
      <div className="weight-plan-ring" style={{"--weight-progress":`${plan.progress*3.6}deg`} as React.CSSProperties}><div><strong>{number.format(plan.progress)}%</strong><span>CONCLUÍDO</span></div></div>
      <div className="weight-plan-hero-copy"><span>{plan.progress>=100?"META ALCANÇADA":"PROGRESSO GERAL"}</span><h2>{plan.current!=null?`${number.format(plan.current)} kg`:"Sem medição"} <small>→ {number.format(plan.target)} kg</small></h2><p>{plan.remaining!=null?`Faltam ${number.format(plan.remaining)} kg. ${plan.motivation}`:"Registre uma medição de peso no Hevy para iniciar a leitura."}</p><div className="weight-plan-tags"><b>{plan.onTrack?"Tendência favorável":"Tendência em formação"}</b><b>{plan.points.length} medições analisadas</b></div></div>
      <div className="weight-plan-forecast"><Sparkles/><span>PREVISÃO DINÂMICA</span><strong>{plan.progress>=100?"Concluída":plan.etaDate?plan.etaDate.toLocaleDateString("pt-BR",{month:"long",year:"numeric"}):"Mais dados necessários"}</strong><small>{plan.etaWeeks!=null&&plan.progress<100?`${plan.etaWeeks} semanas mantendo a tendência`:plan.progress>=100?"Agora o foco é sustentar o resultado":"A previsão aparece quando o ritmo aponta para a meta"}</small></div>
    </section>
    <section className="weight-plan-grid">
      <article className="weight-plan-chart panel"><div className="panel-head"><div><p className="eyebrow">TRAJETÓRIA</p><h2>Peso real × peso-alvo</h2></div><TrendingDown/></div>{plan.points.length>1?<div className="weight-detail-chart" onPointerMove={event=>{const rect=event.currentTarget.getBoundingClientRect();setHovered(Math.round(Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width))*(plan.points.length-1)))}} onPointerLeave={()=>setHovered(null)}><svg viewBox="0 0 100 100" preserveAspectRatio="none"><defs><linearGradient id="weight-detail-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--lime)" stopOpacity=".3"/><stop offset="1" stopColor="var(--lime)" stopOpacity="0"/></linearGradient></defs><line x1="0" x2="100" y1={plan.y(plan.target)} y2={plan.y(plan.target)} className="weight-detail-target" vectorEffect="non-scaling-stroke"/><path d={`${plan.path} L100 100 L0 100Z`} fill="url(#weight-detail-area)"/><path d={plan.path} className="weight-detail-line" vectorEffect="non-scaling-stroke"/></svg><span className="weight-detail-target-label" style={{top:`${plan.y(plan.target)}%`}}>META {number.format(plan.target)} KG</span>{active&&<div className={`weight-detail-cursor ${activeX>72?"right":""}`} style={{left:`${activeX}%`}}><i/><b style={{top:`${plan.y(active.value)}%`}}/><div style={{top:`${Math.max(4,plan.y(active.value)-4)}%`}}><small>{active.label}</small><strong>{number.format(active.value)} kg</strong></div></div>}<footer><span>{plan.points[0].label}</span><span>{plan.points.at(-1)!.label}</span></footer></div>:<div className="weight-plan-empty">Adicione pelo menos duas medições no Hevy.</div>}</article>
      <article className="weight-plan-status panel"><p className="eyebrow">LEITURA DO MOMENTO</p><h2>{plan.onTrack?"Você está avançando.":"Vamos recuperar a direção."}</h2><div><span>Ritmo recente</span><strong>{plan.points.length>1?`${plan.rate>0?"+":""}${number.format(plan.rate)} kg/sem`:"—"}</strong></div><div><span>Frequência de treino</span><strong>{number.format(plan.avgFrequency)}×/sem</strong></div><div><span>Semanas ativas</span><strong>{plan.activeWeeks}/4</strong></div><div><span>Séries com carga</span><strong>{plan.strengthSets}</strong></div><p><Gauge/>{plan.onTrack?"O ritmo recente aponta para a meta. Use a previsão como referência, não como prazo rígido.":"Priorize quatro semanas consistentes antes de interpretar oscilações isoladas."}</p></article>
    </section>
    <section className="weight-milestones"><div className="section-head"><div><p className="eyebrow">MARCOS</p><h2>O caminho em quatro conquistas.</h2></div><span>{number.format(plan.remaining??0)} kg restantes</span></div><div>{plan.milestones.map(item=><article className={item.complete?"complete":""} key={item.percent}><i>{item.complete?<Check/>:item.percent}</i><span>{item.percent}% do plano</span><strong>{item.value!=null?`${number.format(item.value)} kg`:"—"}</strong><small>{item.complete?"Marco conquistado":"Próxima referência"}</small></article>)}</div></section>
    <section className="weight-coach-plan"><div className="weight-coach-intro"><Sparkles/><div><p className="eyebrow">COACH · PRÓXIMAS 4 SEMANAS</p><h2>Proteja o resultado enquanto o peso muda.</h2><p>O Hevy não registra alimentação ou gasto calórico. Este plano cuida do que seus dados permitem avaliar: treino, força, recuperação e consistência.</p></div></div><div className="weight-coach-actions"><article><b>01</b><div><span>CONSISTÊNCIA</span><strong>Busque {plan.weeklyGoal} sessões por semana</strong><small>Regularidade cria uma base mais confiável que compensações pontuais.</small></div><CalendarClock/></article><article><b>02</b><div><span>FORÇA</span><strong>Mantenha séries efetivas com carga</strong><small>Observe a performance dos movimentos principais enquanto o peso evolui.</small></div><Dumbbell/></article><article><b>03</b><div><span>MEDIÇÃO</span><strong>Registre em condições parecidas</strong><small>{plan.measurementGap!=null?`Seu intervalo recente foi de ${number.format(plan.measurementGap)} dias.`:"Crie uma cadência semanal para formar tendência."}</small></div><Scale/></article><article><b>04</b><div><span>RECUPERAÇÃO</span><strong>Não persiga a previsão a qualquer custo</strong><small>Quedas persistentes de força e fadiga elevada pedem ajuste, não mais pressa.</small></div><Activity/></article></div></section>
    <section className="weight-motivation-banner"><Sparkles/><div><span>MENSAGEM DO COACH</span><h2>{plan.motivation}</h2></div><a href="/coach">Conversar com o Coach <ChevronRight/></a></section>
    <footer><span><Activity/> Análise baseada nas medições e treinos do Hevy</span><span>Atualizado {new Date(data.fetchedAt).toLocaleString("pt-BR")}</span></footer>
  </main></div>;
}

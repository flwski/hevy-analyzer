"use client";

import useSWR from "swr";
import Link from "next/link";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card, SectionHeader, Skeleton, ErrorState, Badge } from "@/components/ui";
import { UnitToggle, Weight } from "@/components/weight";
import { useUnit } from "@/components/unit-context";
import { fetcher } from "@/lib/fetcher";
import { formatDateTime, kgToLb, round } from "@/lib/format";
import { Flame, CalendarCheck, Timer, Dumbbell } from "lucide-react";

interface OverviewResponse {
  totalWorkouts: number;
  analyzedWorkouts: number;
  thisWeekCount: number;
  weekStreak: number;
  avgDurationMinutes: number;
  totalVolumeRecentKg: number;
  weeklyVolume: { weekKey: string; label: string; volumeKg: number; workoutCount: number }[];
  topExercises: { title: string; exerciseTemplateId: string; count: number }[];
  recentWorkouts: {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    exerciseCount: number;
    volumeKg: number;
  }[];
}

export default function DashboardPage() {
  const { unit } = useUnit();
  const { data, error, isLoading } = useSWR<OverviewResponse>(
    "/api/overview",
    fetcher,
    { revalidateOnFocus: false }
  );

  const chartData = data?.weeklyVolume.map((w) => ({
    ...w,
    displayVolume: round(unit === "kg" ? w.volumeKg : kgToLb(w.volumeKg), 0),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Painel</h1>
          <p className="text-sm text-muted">Resumo do seu progresso no Hevy</p>
        </div>
        <UnitToggle />
      </div>

      {error && <ErrorState message={error.message} />}

      {isLoading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTileEl
              label="Total de treinos"
              value={String(data.totalWorkouts)}
              icon={<Dumbbell size={16} className="text-accent" />}
            />
            <StatTileEl
              label="Esta semana"
              value={String(data.thisWeekCount)}
              icon={<CalendarCheck size={16} className="text-accent-2" />}
            />
            <StatTileEl
              label="Sequência"
              value={`${data.weekStreak} sem.`}
              icon={<Flame size={16} className="text-warning" />}
            />
            <StatTileEl
              label="Duração média"
              value={`${data.avgDurationMinutes} min`}
              icon={<Timer size={16} className="text-success" />}
            />
          </div>

          <Card>
            <SectionHeader
              title="Volume semanal (últimas 12 semanas)"
              action={
                <span className="text-xs text-muted">
                  Total recente: <Weight kg={data.totalVolumeRecentKg} />
                </span>
              }
            />
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ left: -20, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="volumeFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "var(--muted)", fontSize: 11 }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "var(--muted)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: "var(--foreground)" }}
                    formatter={(value) => [`${Math.round(Number(value))} ${unit}`, "Volume"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="displayVolume"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    fill="url(#volumeFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <SectionHeader title="Exercícios mais frequentes" />
              <ul className="flex flex-col gap-2">
                {data.topExercises.map((ex) => (
                  <li key={ex.exerciseTemplateId}>
                    <Link
                      href={`/exercises/${ex.exerciseTemplateId}`}
                      className="flex items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-surface-2"
                    >
                      <span>{ex.title}</span>
                      <Badge tone="accent">{ex.count}x</Badge>
                    </Link>
                  </li>
                ))}
                {data.topExercises.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted">Sem dados ainda</p>
                )}
              </ul>
            </Card>

            <Card>
              <SectionHeader
                title="Treinos recentes"
                action={
                  <Link href="/workouts" className="text-xs font-medium text-accent">
                    Ver todos
                  </Link>
                }
              />
              <ul className="flex flex-col gap-2">
                {data.recentWorkouts.map((w) => (
                  <li key={w.id}>
                    <Link
                      href={`/workouts/${w.id}`}
                      className="flex items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-surface-2"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{w.title}</span>
                        <span className="text-xs text-muted">
                          {formatDateTime(w.start_time)} · {w.exerciseCount} exercícios
                        </span>
                      </div>
                      <span className="text-xs text-muted">
                        <Weight kg={w.volumeKg} />
                      </span>
                    </Link>
                  </li>
                ))}
                {data.recentWorkouts.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted">Sem treinos ainda</p>
                )}
              </ul>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function StatTileEl({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
          {label}
        </span>
        {icon}
      </div>
      <span className="text-xl font-semibold tracking-tight sm:text-2xl">{value}</span>
    </Card>
  );
}

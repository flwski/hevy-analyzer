"use client";

import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Dot,
} from "recharts";
import { ArrowLeft, Trophy } from "lucide-react";
import { Card, SectionHeader, Skeleton, ErrorState, EmptyState, Badge } from "@/components/ui";
import { Weight, UnitToggle } from "@/components/weight";
import { useUnit } from "@/components/unit-context";
import { fetcher } from "@/lib/fetcher";
import { formatDate, kgToLb, round } from "@/lib/format";
import type { ExerciseSessionPoint } from "@/lib/analytics";
import type { ExerciseTemplate } from "@/lib/types";

interface HistoryResponse {
  sessions: ExerciseSessionPoint[];
}

export default function ExerciseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { unit } = useUnit();
  const { data, error, isLoading } = useSWR<HistoryResponse>(
    params.id ? `/api/exercise-history/${params.id}` : null,
    fetcher
  );
  const { data: template } = useSWR<ExerciseTemplate>(
    params.id ? `/api/exercise-templates/${params.id}` : null,
    fetcher
  );

  const sessions = data?.sessions ?? [];
  const chartData = sessions.map((s) => ({
    ...s,
    dateLabel: formatDate(s.date, { day: "2-digit", month: "2-digit" }),
    displayWeight: round(unit === "kg" ? s.bestWeightKg : kgToLb(s.bestWeightKg), 1),
  }));

  const weightPRs = sessions.filter((s) => s.isWeightPR);
  const latestPR = weightPRs.at(-1);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex w-fit items-center gap-1 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft size={16} /> Voltar
        </button>
        <UnitToggle />
      </div>

      {error && <ErrorState message={error.message} />}

      {isLoading && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-56" />
        </div>
      )}

      {data && sessions.length === 0 && (
        <EmptyState message="Ainda não há histórico para este exercício." />
      )}

      {data && sessions.length > 0 && (
        <>
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {template?.title ?? "Exercício"}
            </h1>
            <p className="text-sm text-muted">
              {sessions.length} sessões registradas
              {latestPR && (
                <>
                  {" "}
                  · recorde atual: <Weight kg={latestPR.bestWeightKg} /> x {latestPR.bestWeightReps}
                </>
              )}
            </p>
          </div>

          <Card>
            <SectionHeader title="Peso máximo por sessão" />
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ left: -20, right: 8, top: 8 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="dateLabel"
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
                    formatter={(value) => [`${Number(value)} ${unit}`, "Peso"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="displayWeight"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    dot={(props) => {
                      const point = chartData[props.index];
                      return point?.isWeightPR ? (
                        <Dot
                          key={props.index}
                          cx={props.cx}
                          cy={props.cy}
                          r={4}
                          fill="var(--success)"
                          stroke="var(--success)"
                        />
                      ) : (
                        <Dot
                          key={props.index}
                          cx={props.cx}
                          cy={props.cy}
                          r={2.5}
                          fill="var(--accent)"
                          stroke="var(--accent)"
                        />
                      );
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <SectionHeader title="Recordes pessoais" />
            {weightPRs.length === 0 && (
              <p className="text-sm text-muted">Sem recordes registrados ainda.</p>
            )}
            <ul className="flex flex-col gap-2">
              {weightPRs
                .slice()
                .reverse()
                .slice(0, 5)
                .map((pr) => (
                  <li key={pr.workoutId}>
                    <Link
                      href={`/workouts/${pr.workoutId}`}
                      className="flex items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-surface-2"
                    >
                      <span className="flex items-center gap-2">
                        <Trophy size={14} className="text-warning" />
                        <Weight kg={pr.bestWeightKg} /> x {pr.bestWeightReps}
                      </span>
                      <span className="text-xs text-muted">{formatDate(pr.date)}</span>
                    </Link>
                  </li>
                ))}
            </ul>
          </Card>

          <Card>
            <SectionHeader title="Histórico de sessões" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted">
                    <th className="py-1 font-normal">Data</th>
                    <th className="py-1 font-normal">Melhor peso</th>
                    <th className="py-1 font-normal">Volume</th>
                    <th className="py-1 font-normal"></th>
                  </tr>
                </thead>
                <tbody>
                  {sessions
                    .slice()
                    .reverse()
                    .map((s) => (
                      <tr key={s.workoutId} className="border-t border-border">
                        <td className="py-1.5">
                          <Link href={`/workouts/${s.workoutId}`} className="hover:text-accent">
                            {formatDate(s.date)}
                          </Link>
                        </td>
                        <td className="py-1.5 font-medium">
                          <Weight kg={s.bestWeightKg} /> x {s.bestWeightReps}
                        </td>
                        <td className="py-1.5 text-muted">
                          <Weight kg={s.totalVolumeKg} />
                        </td>
                        <td className="py-1.5">
                          {s.isWeightPR && <Badge tone="success">PR</Badge>}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

"use client";

import useSWR from "swr";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card, SectionHeader, Skeleton, ErrorState, EmptyState } from "@/components/ui";
import { Weight, UnitToggle } from "@/components/weight";
import { useUnit } from "@/components/unit-context";
import { fetcher } from "@/lib/fetcher";
import { formatDate, kgToLb, round } from "@/lib/format";
import type { BodyMeasurement } from "@/lib/types";

interface MeasurementsResponse {
  body_measurements: BodyMeasurement[];
}

export default function MeasurementsPage() {
  const { unit } = useUnit();
  const { data, error, isLoading } = useSWR<MeasurementsResponse>(
    "/api/body-measurements",
    fetcher
  );

  const entries = (data?.body_measurements ?? []).slice().reverse();
  const chartData = entries
    .filter((e) => e.weight_kg !== null)
    .map((e) => ({
      date: e.date,
      label: formatDate(e.date, { day: "2-digit", month: "2-digit" }),
      displayWeight: round(unit === "kg" ? e.weight_kg! : kgToLb(e.weight_kg!), 1),
    }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Medidas</h1>
          <p className="text-sm text-muted">Peso corporal e medidas ao longo do tempo</p>
        </div>
        <UnitToggle />
      </div>

      {error && <ErrorState message={error.message} />}

      {isLoading && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-56" />
          <Skeleton className="h-40" />
        </div>
      )}

      {data && entries.length === 0 && (
        <EmptyState message="Nenhuma medida registrada ainda." />
      )}

      {data && entries.length > 0 && (
        <>
          {chartData.length > 0 && (
            <Card>
              <SectionHeader title="Peso corporal" />
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ left: -20, right: 8, top: 8 }}>
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
                      domain={["dataMin - 2", "dataMax + 2"]}
                      tickFormatter={(value) => String(round(Number(value), 1))}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--surface-2)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      labelStyle={{ color: "var(--foreground)" }}
                      formatter={(value) => [`${value} ${unit}`, "Peso"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="displayWeight"
                      stroke="var(--accent-2)"
                      strokeWidth={2}
                      dot={{ r: 2.5, fill: "var(--accent-2)" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          <Card>
            <SectionHeader title="Registros" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted">
                    <th className="py-1 font-normal">Data</th>
                    <th className="py-1 font-normal">Peso</th>
                    <th className="py-1 font-normal">% Gordura</th>
                    <th className="py-1 font-normal">Cintura</th>
                    <th className="py-1 font-normal">Peito</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.date} className="border-t border-border">
                      <td className="py-1.5">{formatDate(e.date)}</td>
                      <td className="py-1.5 font-medium">
                        {typeof e.weight_kg === "number" ? <Weight kg={e.weight_kg} /> : "-"}
                      </td>
                      <td className="py-1.5 text-muted">
                        {typeof e.fat_percent === "number" ? `${e.fat_percent}%` : "-"}
                      </td>
                      <td className="py-1.5 text-muted">
                        {typeof e.waist === "number" ? `${e.waist} cm` : "-"}
                      </td>
                      <td className="py-1.5 text-muted">
                        {typeof e.chest_cm === "number" ? `${e.chest_cm} cm` : "-"}
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

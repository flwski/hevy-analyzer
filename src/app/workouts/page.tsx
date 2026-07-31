"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, Skeleton, ErrorState, EmptyState } from "@/components/ui";
import { Weight, UnitToggle } from "@/components/weight";
import { fetcher } from "@/lib/fetcher";
import { formatDateTime } from "@/lib/format";

interface WorkoutsResponse {
  page: number;
  page_count: number;
  workouts: {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    exerciseCount: number;
    setCount: number;
    volumeKg: number;
  }[];
}

const PAGE_SIZE = 10;

export default function WorkoutsPage() {
  const [page, setPage] = useState(1);
  const { data, error, isLoading } = useSWR<WorkoutsResponse>(
    `/api/workouts?page=${page}&pageSize=${PAGE_SIZE}`,
    fetcher,
    { keepPreviousData: true }
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Treinos</h1>
          <p className="text-sm text-muted">Histórico completo de treinos</p>
        </div>
        <UnitToggle />
      </div>

      {error && <ErrorState message={error.message} />}

      {isLoading && !data && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      )}

      {data && data.workouts.length === 0 && (
        <EmptyState message="Nenhum treino encontrado." />
      )}

      {data && data.workouts.length > 0 && (
        <div className="flex flex-col gap-2">
          {data.workouts.map((w) => (
            <Link key={w.id} href={`/workouts/${w.id}`}>
              <Card className="flex items-center justify-between transition-colors hover:border-accent/40">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{w.title}</span>
                  <span className="text-xs text-muted">{formatDateTime(w.start_time)}</span>
                </div>
                <div className="flex flex-col items-end gap-0.5 text-right">
                  <span className="text-sm font-medium">
                    <Weight kg={w.volumeKg} />
                  </span>
                  <span className="text-xs text-muted">
                    {w.exerciseCount} exerc. · {w.setCount} séries
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {data && data.page_count > 1 && (
        <div className="flex items-center justify-center gap-3 pb-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm disabled:opacity-40"
          >
            <ChevronLeft size={16} /> Anterior
          </button>
          <span className="text-sm text-muted">
            Página {data.page} de {data.page_count}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.page_count, p + 1))}
            disabled={page >= data.page_count}
            className="flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Próxima <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Search } from "lucide-react";
import { Card, Skeleton, ErrorState, EmptyState, Badge } from "@/components/ui";
import { fetcher } from "@/lib/fetcher";
import type { ExerciseTemplate } from "@/lib/types";

const MUSCLE_LABEL: Record<string, string> = {
  abdominals: "Abdômen",
  shoulders: "Ombros",
  biceps: "Bíceps",
  triceps: "Tríceps",
  forearms: "Antebraço",
  quadriceps: "Quadríceps",
  hamstrings: "Posterior",
  calves: "Panturrilha",
  glutes: "Glúteos",
  abductors: "Abdutores",
  adductors: "Adutores",
  lats: "Dorsais",
  upper_back: "Costas (sup.)",
  traps: "Trapézio",
  lower_back: "Lombar",
  chest: "Peito",
  cardio: "Cardio",
  neck: "Pescoço",
  full_body: "Corpo todo",
  other: "Outro",
};

export default function ExercisesPage() {
  const [query, setQuery] = useState("");
  const { data, error, isLoading } = useSWR<{ exercise_templates: ExerciseTemplate[] }>(
    "/api/exercise-templates",
    fetcher
  );

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.toLowerCase().trim();
    if (!q) return data.exercise_templates;
    return data.exercise_templates.filter((t) => t.title.toLowerCase().includes(q));
  }, [data, query]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Exercícios</h1>
        <p className="text-sm text-muted">Busque um exercício para ver sua evolução</p>
      </div>

      <div className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar exercício..."
          className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-muted focus:border-accent"
        />
      </div>

      {error && <ErrorState message={error.message} />}

      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      )}

      {data && filtered.length === 0 && <EmptyState message="Nenhum exercício encontrado." />}

      {data && filtered.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {filtered.map((ex) => (
            <Link key={ex.id} href={`/exercises/${ex.id}`}>
              <Card className="flex items-center justify-between transition-colors hover:border-accent/40">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">{ex.title}</span>
                  <div className="flex gap-1.5">
                    <Badge>{MUSCLE_LABEL[ex.primary_muscle_group] ?? ex.primary_muscle_group}</Badge>
                    {ex.is_custom && <Badge tone="accent">Custom</Badge>}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

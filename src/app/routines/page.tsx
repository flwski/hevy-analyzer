"use client";

import useSWR from "swr";
import { ChevronDown, Folder } from "lucide-react";
import { Card, Skeleton, ErrorState, EmptyState, Badge } from "@/components/ui";
import { Weight, UnitToggle } from "@/components/weight";
import { fetcher } from "@/lib/fetcher";
import type { Routine, RoutineFolder } from "@/lib/types";

interface RoutinesResponse {
  routines: Routine[];
  folders: RoutineFolder[];
}

export default function RoutinesPage() {
  const { data, error, isLoading } = useSWR<RoutinesResponse>("/api/routines", fetcher);

  const folderName = (folderId: number | null) => {
    if (folderId === null) return "Minhas Rotinas";
    return data?.folders.find((f) => f.id === folderId)?.title ?? "Pasta";
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Rotinas</h1>
          <p className="text-sm text-muted">Seus templates de treino salvos</p>
        </div>
        <UnitToggle />
      </div>

      {error && <ErrorState message={error.message} />}

      {isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      )}

      {data && data.routines.length === 0 && <EmptyState message="Nenhuma rotina encontrada." />}

      {data && data.routines.length > 0 && (
        <div className="flex flex-col gap-3">
          {data.routines.map((routine) => (
            <Card key={routine.id} className="p-0">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between p-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{routine.title}</span>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-muted">
                      <Folder size={12} /> {folderName(routine.folder_id)} ·{" "}
                      {routine.exercises.length} exercícios
                    </span>
                  </div>
                  <ChevronDown
                    size={18}
                    className="text-muted transition-transform group-open:rotate-180"
                  />
                </summary>
                <div className="flex flex-col gap-3 border-t border-border p-4">
                  {routine.notes && (
                    <p className="text-xs text-muted">{routine.notes}</p>
                  )}
                  {routine.exercises.map((exercise, idx) => (
                    <div key={`${exercise.exercise_template_id}-${idx}`}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-sm font-medium">{exercise.title}</span>
                        {exercise.supersets_id !== null && (
                          <Badge tone="accent">Superset</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {exercise.sets.map((set, sIdx) => (
                          <span
                            key={sIdx}
                            className="rounded-md bg-surface-2 px-2 py-1 text-xs text-muted"
                          >
                            {typeof set.weight_kg === "number" ? <Weight kg={set.weight_kg} /> : "corpo"}
                            {" x "}
                            {set.reps ?? `${set.rep_range?.start ?? "?"}-${set.rep_range?.end ?? "?"}`}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

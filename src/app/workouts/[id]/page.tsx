"use client";

import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { ArrowLeft, Clock } from "lucide-react";
import { Card, Skeleton, ErrorState, Badge } from "@/components/ui";
import { Weight } from "@/components/weight";
import { fetcher } from "@/lib/fetcher";
import { formatDateTime, formatDuration, workoutDurationSeconds } from "@/lib/format";
import { workoutVolumeKg } from "@/lib/analytics";
import type { Workout } from "@/lib/types";

const SET_TYPE_LABEL: Record<string, string> = {
  warmup: "Aquec.",
  normal: "Normal",
  failure: "Falha",
  dropset: "Dropset",
};

export default function WorkoutDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data, error, isLoading } = useSWR<Workout>(
    params.id ? `/api/workouts/${params.id}` : null,
    fetcher
  );

  return (
    <div className="flex flex-col gap-5">
      <button
        onClick={() => router.back()}
        className="flex w-fit items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft size={16} /> Voltar
      </button>

      {error && <ErrorState message={error.message} />}

      {isLoading && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      )}

      {data && (
        <>
          <Card>
            <h1 className="text-xl font-semibold tracking-tight">{data.title}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              <span>{formatDateTime(data.start_time)}</span>
              <span className="flex items-center gap-1">
                <Clock size={14} />
                {formatDuration(workoutDurationSeconds(data.start_time, data.end_time))}
              </span>
              <span>
                Volume total: <Weight kg={workoutVolumeKg(data)} />
              </span>
            </div>
            {data.description && (
              <p className="mt-3 text-sm text-muted">{data.description}</p>
            )}
          </Card>

          <div className="flex flex-col gap-3">
            {data.exercises.map((exercise, idx) => (
              <Card key={`${exercise.exercise_template_id}-${idx}`}>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-medium">{exercise.title}</h3>
                  {exercise.supersets_id !== null && (
                    <Badge tone="accent">Superset</Badge>
                  )}
                </div>
                {exercise.notes && (
                  <p className="mb-2 text-xs text-muted">{exercise.notes}</p>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-muted">
                        <th className="w-10 py-1 font-normal">#</th>
                        <th className="py-1 font-normal">Tipo</th>
                        <th className="py-1 font-normal">Peso</th>
                        <th className="py-1 font-normal">Reps</th>
                        <th className="py-1 font-normal">RPE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exercise.sets.map((set, sIdx) => (
                        <tr key={sIdx} className="border-t border-border">
                          <td className="py-1.5 text-muted">{sIdx + 1}</td>
                          <td className="py-1.5">
                            {set.type === "normal" ? (
                              <span className="text-muted">-</span>
                            ) : (
                              <Badge
                                tone={set.type === "failure" ? "success" : "default"}
                              >
                                {SET_TYPE_LABEL[set.type] ?? set.type}
                              </Badge>
                            )}
                          </td>
                          <td className="py-1.5 font-medium">
                            {set.weight_kg !== null ? <Weight kg={set.weight_kg} /> : "-"}
                          </td>
                          <td className="py-1.5">{set.reps ?? "-"}</td>
                          <td className="py-1.5 text-muted">{set.rpe ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

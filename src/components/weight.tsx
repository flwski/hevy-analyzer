"use client";

import { useUnit } from "@/components/unit-context";
import { formatWeight } from "@/lib/format";

export function Weight({ kg }: { kg: number | null | undefined }) {
  const { unit } = useUnit();
  return <>{formatWeight(kg, unit)}</>;
}

export function UnitToggle() {
  const { unit, toggleUnit } = useUnit();
  return (
    <button
      onClick={toggleUnit}
      className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:text-foreground"
    >
      {unit === "kg" ? "kg" : "lb"}
      <span className="ml-1 text-[10px] text-muted/70">trocar</span>
    </button>
  );
}

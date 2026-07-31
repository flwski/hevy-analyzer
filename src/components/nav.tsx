"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Dumbbell,
  ListChecks,
  NotebookText,
  Ruler,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Painel", icon: LayoutDashboard },
  { href: "/workouts", label: "Treinos", icon: ListChecks },
  { href: "/exercises", label: "Exercícios", icon: Dumbbell },
  { href: "/routines", label: "Rotinas", icon: NotebookText },
  { href: "/measurements", label: "Medidas", icon: Ruler },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:border-r md:border-border md:bg-surface/60 md:px-4 md:py-6">
      <div className="mb-8 flex items-center gap-2 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">
          <Dumbbell size={18} />
        </div>
        <span className="text-lg font-semibold tracking-tight">Hevy Insights</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-accent/15 text-foreground"
                  : "text-muted hover:bg-surface-2 hover:text-foreground"
              }`}
            >
              <Icon size={18} className={active ? "text-accent" : ""} />
              {label}
            </Link>
          );
        })}
      </nav>
      <p className="px-2 text-xs text-muted">Dados via Hevy API</p>
    </aside>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-surface/95 backdrop-blur md:hidden">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
              active ? "text-accent" : "text-muted"
            }`}
          >
            <Icon size={20} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

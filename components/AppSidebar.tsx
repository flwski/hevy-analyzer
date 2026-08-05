"use client";

import Link from "next/link";
import { BarChart3, CalendarDays, ChevronLeft, ChevronRight, Dumbbell, Sparkles, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import type { HevyUser } from "@/lib/types";
import GlobalCoachChat from "@/components/GlobalCoachChat";

export function AppLogo({ compact = false }: { compact?: boolean }) {
  return <div className={`app-logo classic ${compact ? "compact" : ""}`}><div className="brand-mark" aria-hidden="true"><Dumbbell /></div>{!compact && <span className="classic-logo-type">HEVY<br /><b>ANALYTICS</b></span>}</div>;
}

export default function AppSidebar({ active, user, workoutCount }: { active: "dashboard" | "calendar" | "exercises" | "coach" | "profile"; user: HevyUser | null; workoutCount: number }) {
  const [collapsed, setCollapsed] = useState(true);
  useEffect(() => { const saved = sessionStorage.getItem("hevy-sidebar-collapsed"); setCollapsed(saved == null ? true : saved === "true"); }, []);
  function toggle() { setCollapsed(value => { const next = !value; sessionStorage.setItem("hevy-sidebar-collapsed", String(next)); return next; }); }
  const links = [
    { id: "dashboard", href: "/", label: "Visão geral", icon: BarChart3 },
    { id: "calendar", href: "/calendar", label: "Calendário", icon: CalendarDays },
    { id: "exercises", href: "/exercises", label: "Exercícios", icon: Dumbbell },
    { id: "coach", href: "/coach", label: "Coach", icon: Sparkles },
    { id: "profile", href: "/profile", label: "Perfil", icon: UserRound },
  ] as const;
  return <aside className={`app-sidebar ${collapsed ? "collapsed" : "expanded"}`}>
    <AppLogo compact={collapsed} />
    <button className="sidebar-toggle" onClick={toggle} aria-label={collapsed ? "Expandir menu" : "Recolher menu"} title={collapsed ? "Expandir menu" : "Recolher menu"}>{collapsed ? <ChevronRight /> : <ChevronLeft />}</button>
    <nav>{links.map(({ id, href, label, icon: Icon }) => <Link key={id} className={active === id ? "active" : ""} href={href} title={collapsed ? label : undefined}><Icon /><span>{label}</span></Link>)}</nav>
    <Link href="/profile" className="side-profile" title={collapsed ? user?.name ?? "Perfil" : undefined}><div className="avatar">{user?.name?.[0] ?? "H"}</div><div className="side-profile-copy"><strong>{user?.name ?? "Atleta"}</strong><small>{workoutCount} treinos no Hevy</small></div></Link>
    <GlobalCoachChat active={active} athleteName={user?.name} />
  </aside>;
}

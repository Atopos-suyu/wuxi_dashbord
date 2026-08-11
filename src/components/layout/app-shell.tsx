"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AudioLines,
  Bell,
  ClipboardCheck,
  ClipboardList,
  FileSpreadsheet,
  Filter,
  GraduationCap,
  Inbox,
  LayoutDashboard,
  LogOut,
  Network,
  Settings,
  Target,
  Users,
  UserRound,
  CalendarDays,
} from "lucide-react";
import { APP_SHORT_NAME, ROLE_LABEL } from "@/lib/constants";
import { countOpenAlerts } from "@/lib/alerts";
import { unreadCount } from "@/lib/notifications";
import { loadWorkbenchSnapshot } from "@/lib/data";
import { useLiveQuery } from "@/lib/data/use-live-query";
import { useSession } from "@/components/providers/session-provider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/overview", label: "总览", icon: LayoutDashboard, need: "region" as const },
  { href: "/funnel", label: "漏斗", icon: Filter, need: "region" as const },
  { href: "/alerts", label: "预警", icon: Bell, need: "region" as const },
  { href: "/notifications", label: "通知", icon: Inbox, need: "region" as const },
  { href: "/goals", label: "目标", icon: Target, need: "region" as const },
  { href: "/briefing", label: "会包", icon: FileSpreadsheet, need: "region" as const },
  { href: "/students", label: "学员", icon: GraduationCap, need: "members" as const },
  { href: "/qa", label: "质检", icon: ClipboardCheck, need: "members" as const },
  { href: "/org", label: "组织", icon: Network, need: "org" as const },
  { href: "/settings", label: "设置", icon: Settings, need: "region" as const },
  { href: "/users", label: "用户", icon: Users, need: "all" as const },
  { href: "/members", label: "成员", icon: UserRound, need: "members" as const },
  { href: "/reviews/daily", label: "日报", icon: ClipboardList, need: "all" as const },
  { href: "/reviews/weekly", label: "周报", icon: CalendarDays, need: "all" as const },
  { href: "/recordings", label: "录音", icon: AudioLines, need: "all" as const },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    profile,
    canSeeRegion,
    canSeeMembers,
    canManageOrg: canOrg,
    logout,
    isDemo,
  } = useSession();

  const { data: snap } = useLiveQuery(
    async () =>
      profile && (canSeeRegion || canSeeMembers)
        ? loadWorkbenchSnapshot(profile)
        : null,
    [profile?.id, canSeeRegion, canSeeMembers],
  );

  const openAlerts = snap?.alerts ? countOpenAlerts(snap.alerts) : 0;
  const unreadNotifs =
    profile && snap?.notifications
      ? unreadCount(snap.notifications, profile.id)
      : 0;

  const items = NAV.filter((n) => {
    if (n.need === "region") return canSeeRegion;
    if (n.need === "members") return canSeeMembers;
    if (n.need === "org") return canOrg;
    return true;
  });

  return (
    <div className="relative min-h-dvh">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="atmosphere-blob atmosphere-blob-a" />
        <div className="atmosphere-blob atmosphere-blob-b" />
        <div className="atmosphere-grid" />
      </div>

      <header className="sticky top-0 z-30 border-b border-[var(--line)]/70 bg-[rgba(244,249,251,0.82)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--ink)] text-sm font-bold text-[var(--mist)]">
              WX
            </div>
            <div>
              <p className="font-[family-name:var(--font-display)] text-base leading-none tracking-tight">
                {APP_SHORT_NAME}
              </p>
              <p className="mt-1 text-[11px] text-[var(--muted)]">
                {profile?.full_name || "未登录"} ·{" "}
                {profile ? ROLE_LABEL[profile.role] : "—"}
                {profile?.school_region ? ` · ${profile.school_region}` : ""}
                {profile?.area ? ` · ${profile.area}` : ""}
                {isDemo ? " · 演示" : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {canSeeRegion ? (
              <Button
                variant="ghost"
                size="icon"
                aria-label="通知"
                className="relative"
                onClick={() => router.push("/notifications")}
              >
                <Inbox className="h-4 w-4" />
                {unreadNotifs > 0 ? (
                  <span className="absolute right-1 top-1 min-w-4 rounded-full bg-rose-500 px-1 text-center text-[9px] font-bold text-white">
                    {unreadNotifs > 9 ? "9+" : unreadNotifs}
                  </span>
                ) : null}
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="icon"
              aria-label="退出"
              onClick={async () => {
                await logout();
                router.replace("/login");
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-6 px-4 pb-28 pt-4 md:pb-8 md:pt-6">
        <aside className="hidden w-48 shrink-0 md:block">
          <nav className="sticky top-20 space-y-1">
            {items.map((item) => {
              const active = pathname.startsWith(item.href);
              const Icon = item.icon;
              const badge =
                item.href === "/alerts"
                  ? openAlerts
                  : item.href === "/notifications"
                    ? unreadNotifs
                    : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-[var(--ink)] text-white"
                      : "text-[var(--ink-soft)] hover:bg-white/70",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="flex-1">{item.label}</span>
                  {badge > 0 ? (
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                        active
                          ? "bg-white/20 text-white"
                          : "bg-rose-100 text-rose-800",
                      )}
                    >
                      {badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--line)]/80 bg-[rgba(244,249,251,0.92)] backdrop-blur-md md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-4 gap-1 px-2 py-2">
          {items.slice(0, 4).map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            const badge =
              item.href === "/alerts"
                ? openAlerts
                : item.href === "/notifications"
                  ? unreadNotifs
                  : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px]",
                  active ? "text-[var(--accent)]" : "text-[var(--muted)]",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
                {badge > 0 ? (
                  <span className="absolute right-2 top-1 min-w-4 rounded-full bg-rose-500 px-1 text-center text-[9px] font-bold text-white">
                    {badge > 9 ? "9+" : badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
        {items.length > 4 ? (
          <div className="flex flex-wrap justify-center gap-3 border-t border-[var(--line)]/50 px-4 py-1.5 pb-[max(0.4rem,env(safe-area-inset-bottom))]">
            {items.slice(4).map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-[11px]",
                    active ? "text-[var(--accent)]" : "text-[var(--muted)]",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ) : null}
      </nav>
    </div>
  );
}

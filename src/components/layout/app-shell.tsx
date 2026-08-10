"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AudioLines,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Users,
  UserRound,
  CalendarDays,
} from "lucide-react";
import { APP_SHORT_NAME } from "@/lib/constants";
import { useSession } from "@/components/providers/session-provider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/dashboard", label: "看板", icon: LayoutDashboard, t0Only: true },
  { href: "/users", label: "用户", icon: Users, t0Only: false },
  { href: "/members", label: "成员", icon: UserRound, t0Only: true },
  { href: "/reviews/daily", label: "日报", icon: ClipboardList, t0Only: false },
  { href: "/reviews/weekly", label: "周报", icon: CalendarDays, t0Only: false },
  { href: "/recordings", label: "录音", icon: AudioLines, t0Only: false },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, isT0, logout, isDemo } = useSession();

  const items = NAV.filter((n) => !n.t0Only || isT0);

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
                {profile?.full_name || "未登录"} · {profile?.role || "—"}
                {isDemo ? " · 演示" : ""}
              </p>
            </div>
          </div>
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
      </header>

      <div className="mx-auto flex max-w-6xl gap-6 px-4 pb-24 pt-4 md:pb-8 md:pt-6">
        <aside className="hidden w-48 shrink-0 md:block">
          <nav className="sticky top-20 space-y-1">
            {items.map((item) => {
              const active = pathname.startsWith(item.href);
              const Icon = item.icon;
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
                  {item.label}
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
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px]",
                  active ? "text-[var(--accent)]" : "text-[var(--muted)]",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
        {items.length > 4 ? (
          <div className="flex justify-center gap-4 border-t border-[var(--line)]/50 px-4 py-1.5 pb-[max(0.4rem,env(safe-area-inset-bottom))]">
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

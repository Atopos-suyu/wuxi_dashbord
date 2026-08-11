"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  CAPABILITY_KEYS,
  MEMBER_STATUS_LABEL,
  ROLE_LABEL,
  TRAFFIC_LABEL,
  type CapabilityScores,
  type TrafficLight,
} from "@/lib/constants";
import { computeAlerts, memberTrafficLight } from "@/lib/alerts";
import { visibleMembers } from "@/lib/permissions";
import { useSession } from "@/components/providers/session-provider";
import { loadWorkbenchSnapshot } from "@/lib/data";
import { useLiveQuery } from "@/lib/data/use-live-query";
import { ScoreRadar } from "@/components/charts/radar-chart";
import { Badge } from "@/components/ui/badge";
import { LoadingBlock } from "@/components/ui/loading";
import { currentWeekPeriod } from "@/lib/utils";

const LIGHT_STYLE: Record<TrafficLight, string> = {
  green: "bg-emerald-100 text-emerald-800",
  yellow: "bg-amber-100 text-amber-900",
  red: "bg-rose-100 text-rose-800",
};

export default function MembersPage() {
  const { profile, canSeeMembers, loading: sessionLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!sessionLoading && !canSeeMembers) router.replace("/users");
  }, [sessionLoading, canSeeMembers, router]);

  const { data, loading } = useLiveQuery(
    async () =>
      profile && canSeeMembers ? loadWorkbenchSnapshot(profile) : null,
    [profile?.id, canSeeMembers],
  );

  const members = useMemo(() => {
    if (!profile || !data) return [];
    return visibleMembers(profile, data.profiles).filter((m) => m.role !== "T3");
  }, [profile, data]);

  const alerts = useMemo(() => {
    if (!data) return [];
    return computeAlerts({
      members: data.profiles,
      users: data.users,
      dailyReviews: data.dailyReviews,
      capabilities: data.capabilities,
      resolutions: data.resolutions,
    });
  }, [data]);

  if (sessionLoading || !canSeeMembers || !profile || loading) {
    return <LoadingBlock />;
  }

  const week = currentWeekPeriod();
  const users = data!.users;
  const capabilities = data!.capabilities;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="section-title text-2xl md:text-3xl">成员看板</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          点击成员进入下钻：用户 · 能力 · 近 7 天日报 · 预警
        </p>
      </div>

      <div className="stagger grid gap-4 md:grid-cols-2">
        {members.map((m) => {
          const mine = users.filter((u) => u.owner_id === m.id);
          const caps = capabilities
            .filter((c) => c.member_id === m.id)
            .sort((a, b) => a.period.localeCompare(b.period));
          const latest = caps.find((c) => c.period === week) ?? caps.at(-1);
          const { light, reasons } = memberTrafficLight({
            member: m,
            users,
            dailyReviews: data!.dailyReviews,
            capabilities,
            alerts,
          });
          const radar = CAPABILITY_KEYS.map((k) => ({
            subject: k.slice(0, 2),
            current: latest?.scores[k as keyof CapabilityScores] ?? 0,
          }));

          return (
            <Link
              key={m.id}
              href={`/members/${m.id}`}
              className="panel block p-4 transition hover:border-[var(--accent)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-semibold">{m.full_name}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {ROLE_LABEL[m.role]}
                    {m.area ? ` · ${m.area}` : ""} · 用户 {mine.length}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge className={LIGHT_STYLE[light]}>
                    {TRAFFIC_LABEL[light]}
                  </Badge>
                  <Badge
                    className={
                      m.status === "active"
                        ? "bg-emerald-50 text-emerald-700"
                        : m.status === "pending"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-rose-50 text-rose-700"
                    }
                  >
                    {MEMBER_STATUS_LABEL[m.status]}
                  </Badge>
                </div>
              </div>
              <p className="mt-2 text-xs text-[var(--muted)]">{reasons[0]}</p>
              <div className="mt-2">
                <ScoreRadar
                  data={radar}
                  series={[
                    {
                      key: "current",
                      color: "#E07A3D",
                      name: latest?.period ?? "—",
                    },
                  ]}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

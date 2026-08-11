"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AREAS,
  FUNNEL_STAGES,
  LEVELS,
  ROLE_LABEL,
  TRAFFIC_LABEL,
  type Level,
  type Stage,
  type TrafficLight,
} from "@/lib/constants";
import { computeAlerts, memberTrafficLight } from "@/lib/alerts";
import { visibleMembers } from "@/lib/permissions";
import { useSession } from "@/components/providers/session-provider";
import { loadWorkbenchSnapshot } from "@/lib/data";
import { useLiveQuery } from "@/lib/data/use-live-query";
import { FunnelBars } from "@/components/charts/funnel-bars";
import { LevelDonut } from "@/components/charts/level-donut";
import { Select } from "@/components/ui/select";
import { LoadingBlock } from "@/components/ui/loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { downloadCsv, isWithinRange } from "@/lib/utils";

const LIGHT_STYLE: Record<TrafficLight, string> = {
  green: "bg-emerald-100 text-emerald-800",
  yellow: "bg-amber-100 text-amber-900",
  red: "bg-rose-100 text-rose-800",
};

export default function OverviewPage() {
  const { profile, canSeeRegion, loading: sessionLoading } = useSession();
  const router = useRouter();
  const [area, setArea] = useState("all");
  const [range, setRange] = useState<"week" | "month" | "all">("week");

  useEffect(() => {
    if (!sessionLoading && !canSeeRegion) router.replace("/users");
  }, [sessionLoading, canSeeRegion, router]);

  const { data, loading } = useLiveQuery(
    async () =>
      profile && canSeeRegion ? loadWorkbenchSnapshot(profile) : null,
    [profile?.id, canSeeRegion],
  );

  const members = useMemo(() => {
    if (!profile || !data) return [];
    return visibleMembers(profile, data.profiles).filter(
      (m) => m.role !== "T3" && (area === "all" || m.area === area),
    );
  }, [profile, data, area]);

  const users = useMemo(() => {
    if (!data) return [];
    return data.users.filter((u) => {
      if (area !== "all" && u.area !== area) return false;
      return true;
    });
  }, [data, area]);

  const alerts = useMemo(() => {
    if (!data) return [];
    return computeAlerts({
      members: data.profiles,
      users: data.users,
      dailyReviews: data.dailyReviews,
      capabilities: data.capabilities,
      resolutions: data.resolutions,
      attitudeLogs: data.attitudeLogs,
      goals: data.goals,
      period: data.period,
    });
  }, [data]);

  const weekNew = users.filter((u) => isWithinRange(u.created_at, "week")).length;
  const weekInterview = users.filter(
    (u) =>
      ["面试", "关系铺垫", "职规", "产品", "关单", "成交"].includes(u.stage) &&
      isWithinRange(u.updated_at, range === "all" ? "all" : range),
  ).length;
  const weekDeals = users.filter(
    (u) => u.stage === "成交" && isWithinRange(u.updated_at, "week"),
  ).length;

  const funnelStock = FUNNEL_STAGES.map((stage) => ({
    stage: stage as Stage,
    count: users.filter((u) => u.stage === stage).length,
  }));

  const levelDist = LEVELS.map((level) => ({
    level: level as Level,
    count: users.filter((u) => u.level === level).length,
  }));

  if (sessionLoading || !canSeeRegion || loading) return <LoadingBlock />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="section-title text-2xl md:text-3xl">片区总览</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            漏斗 · 等级 · 成员红绿灯 · 未处理预警{" "}
            {alerts.filter((a) => !a.resolved).length} 条
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              downloadCsv("overview-traffic.csv", [
                ["成员", "角色", "片区", "红绿灯", "原因", "用户数"],
                ...members.map((m) => {
                  const { light, reasons } = memberTrafficLight({
                    member: m,
                    users,
                    dailyReviews: data!.dailyReviews,
                    capabilities: data!.capabilities,
                    alerts,
                  });
                  return [
                    m.full_name,
                    ROLE_LABEL[m.role],
                    m.area ?? "",
                    TRAFFIC_LABEL[light],
                    reasons.join("；"),
                    String(users.filter((u) => u.owner_id === m.id).length),
                  ];
                }),
              ]);
            }}
          >
            导出 CSV
          </Button>
          <Select
            className="w-28"
            value={area}
            onChange={(e) => setArea(e.target.value)}
          >
            <option value="all">全部片区</option>
            {AREAS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
          <Select
            className="w-28"
            value={range}
            onChange={(e) => setRange(e.target.value as typeof range)}
          >
            <option value="week">本周</option>
            <option value="month">本月</option>
            <option value="all">全部</option>
          </Select>
        </div>
      </div>

      <div className="stagger grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "本周加人", value: weekNew },
          { label: "面试+推进", value: weekInterview },
          { label: "本周成交", value: weekDeals },
          { label: "总用户", value: users.length },
        ].map((m) => (
          <div key={m.label} className="panel p-4">
            <p className="text-xs text-[var(--muted)]">{m.label}</p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums">
              {m.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel p-4">
          <h2 className="mb-4 font-semibold">全员漏斗</h2>
          <FunnelBars data={funnelStock} />
        </section>
        <section className="panel p-4">
          <h2 className="mb-4 font-semibold">等级分布</h2>
          <LevelDonut data={levelDist} />
        </section>
      </div>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--line)]/70 px-4 py-3">
          <h2 className="font-semibold">成员红绿灯</h2>
          <Link href="/alerts" className="text-sm text-[var(--lake)]">
            预警中心 →
          </Link>
        </div>
        <div className="divide-y divide-[var(--line)]/70">
          {members.map((m) => {
            const { light, reasons } = memberTrafficLight({
              member: m,
              users,
              dailyReviews: data!.dailyReviews,
              capabilities: data!.capabilities,
              alerts,
            });
            const mine = users.filter((u) => u.owner_id === m.id);
            return (
              <Link
                key={m.id}
                href={`/members/${m.id}`}
                className="flex items-start gap-3 px-4 py-3 transition hover:bg-white/60"
              >
                <span
                  className={`mt-0.5 inline-flex min-w-14 items-center justify-center rounded-md px-2 py-0.5 text-xs font-semibold ${LIGHT_STYLE[light]}`}
                >
                  {TRAFFIC_LABEL[light]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {m.full_name}{" "}
                    <span className="text-xs text-[var(--muted)]">
                      {ROLE_LABEL[m.role]}
                      {m.area ? ` · ${m.area}` : ""}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    用户 {mine.length} · A/S{" "}
                    {mine.filter((u) => u.level === "A" || u.level === "S").length}{" "}
                    · {reasons[0]}
                  </p>
                </div>
                <Badge className="bg-[var(--surface-2)] text-[var(--ink-soft)]">
                  {light === "red" ? "干预" : light === "yellow" ? "观察" : "OK"}
                </Badge>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

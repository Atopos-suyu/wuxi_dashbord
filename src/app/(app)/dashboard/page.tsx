"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import {
  FUNNEL_STAGES,
  LEVELS,
  type Level,
  type Stage,
} from "@/lib/constants";
import { useSession } from "@/components/providers/session-provider";
import { loadWorkbenchSnapshot } from "@/lib/data";
import { useLiveQuery } from "@/lib/data/use-live-query";
import { FunnelBars } from "@/components/charts/funnel-bars";
import { LevelDonut } from "@/components/charts/level-donut";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { LoadingBlock } from "@/components/ui/loading";
import { downloadCsv, isWithinRange } from "@/lib/utils";

export default function DashboardPage() {
  const { profile, isT0, loading: sessionLoading } = useSession();
  const router = useRouter();
  const [range, setRange] = useState<"week" | "month" | "all">("week");

  useEffect(() => {
    if (!sessionLoading && !isT0) router.replace("/users");
  }, [sessionLoading, isT0, router]);

  const { data, loading } = useLiveQuery(
    async () =>
      profile && isT0 ? loadWorkbenchSnapshot(profile) : null,
    [profile?.id, isT0],
  );

  const users = data?.users ?? [];
  const profiles = data?.profiles ?? [];

  const funnelStock = useMemo(
    () =>
      FUNNEL_STAGES.map((stage) => ({
        stage: stage as Stage,
        count: users.filter((u) => u.stage === stage).length,
      })),
    [users],
  );

  const levelDist = useMemo(
    () =>
      LEVELS.map((level) => ({
        level: level as Level,
        count: users.filter((u) => u.level === level).length,
      })),
    [users],
  );

  const weekDeals = users.filter(
    (u) => u.stage === "成交" && isWithinRange(u.updated_at, "week"),
  );
  const weekNewA = users.filter(
    (u) => u.level === "A" && isWithinRange(u.created_at, "week"),
  );
  const interviewCount = users.filter((u) =>
    ["面试", "关系铺垫", "职规", "产品", "关单", "成交"].includes(u.stage),
  ).length;
  const conversion =
    users.length === 0
      ? 0
      : Math.round(
          (users.filter((u) => u.stage === "成交").length / users.length) *
            1000,
        ) / 10;

  const ranking = useMemo(() => {
    const members = profiles.filter((p) => p.role !== "T0");
    return members
      .map((m) => {
        const mine = users.filter((u) => u.owner_id === m.id);
        return {
          id: m.id,
          name: m.full_name,
          total: mine.length,
          aCount: mine.filter((u) => u.level === "A" || u.level === "S").length,
          deals: mine.filter((u) => u.stage === "成交").length,
        };
      })
      .sort(
        (a, b) => b.deals - a.deals || b.aCount - a.aCount || b.total - a.total,
      );
  }, [users, profiles]);

  const metrics = [
    { label: "总用户", value: users.length },
    { label: "已面试+", value: interviewCount },
    { label: "本周新增 A", value: weekNewA.length },
    { label: "本周成交", value: weekDeals.length },
    { label: "转化率", value: `${conversion}%` },
  ];

  if (sessionLoading || !isT0 || loading) return <LoadingBlock />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="section-title text-2xl md:text-3xl">全局看板</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            T0 一眼看清漏斗、等级与成员产出
            {range !== "all"
              ? ` · 筛选：${range === "week" ? "本周" : "本月"}`
              : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Select
            value={range}
            onChange={(e) => setRange(e.target.value as typeof range)}
            className="w-28"
          >
            <option value="week">本周</option>
            <option value="month">本月</option>
            <option value="all">全部</option>
          </Select>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              downloadCsv("users-export.csv", [
                ["姓名", "等级", "阶段", "专业", "渠道", "负责人", "成交金额"],
                ...users.map((u) => [
                  u.name,
                  u.level,
                  u.stage,
                  u.major,
                  u.channel,
                  u.owner?.full_name ?? "",
                  String(u.deal_amount ?? ""),
                ]),
              ]);
            }}
          >
            <Download className="h-4 w-4" />
            导出
          </Button>
        </div>
      </div>

      <div className="stagger grid grid-cols-2 gap-3 md:grid-cols-5">
        {metrics.map((m) => (
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
          <h2 className="mb-4 font-semibold">业务漏斗（存量）</h2>
          <FunnelBars data={funnelStock} />
        </section>
        <section className="panel p-4">
          <h2 className="mb-4 font-semibold">等级分布</h2>
          <LevelDonut data={levelDist} />
        </section>
      </div>

      <section className="panel overflow-hidden">
        <div className="border-b border-[var(--line)]/70 px-4 py-3">
          <h2 className="font-semibold">成员排名</h2>
        </div>
        <div className="divide-y divide-[var(--line)]/70">
          {ranking.map((r, idx) => (
            <div
              key={r.id}
              className="flex items-center gap-3 px-4 py-3 text-sm"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--surface-2)] font-semibold">
                {idx + 1}
              </span>
              <div className="flex-1">
                <p className="font-medium">{r.name}</p>
                <p className="text-xs text-[var(--muted)]">
                  用户 {r.total} · A/S {r.aCount} · 成交 {r.deals}
                </p>
              </div>
              <span className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--accent)]">
                {r.deals}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

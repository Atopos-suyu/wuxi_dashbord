"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GOAL_METRICS, type GoalMetric } from "@/lib/constants";
import { computeGoalActuals, previousWeekPeriod } from "@/lib/metrics";
import { useSession } from "@/components/providers/session-provider";
import { copyGoalsFromPeriod, loadWorkbenchSnapshot, upsertGoal } from "@/lib/data";
import { useLiveQuery } from "@/lib/data/use-live-query";
import { visibleMembers } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { LoadingBlock } from "@/components/ui/loading";
import { currentWeekPeriod, downloadCsv } from "@/lib/utils";

export default function GoalsPage() {
  const { profile, canSeeRegion, loading: sessionLoading } = useSession();
  const router = useRouter();
  const week = currentWeekPeriod();
  const [scope, setScope] = useState<"team" | "member">("team");
  const [memberId, setMemberId] = useState("all");

  useEffect(() => {
    if (!sessionLoading && !canSeeRegion) router.replace("/users");
  }, [sessionLoading, canSeeRegion, router]);

  const { data, loading, reload } = useLiveQuery(
    async () =>
      profile && canSeeRegion ? loadWorkbenchSnapshot(profile) : null,
    [profile?.id, canSeeRegion],
  );

  const members = useMemo(() => {
    if (!profile || !data) return [];
    return visibleMembers(profile, data.profiles).filter((m) =>
      ["T0", "T1"].includes(m.role),
    );
  }, [profile, data]);

  const actuals = useMemo(() => {
    const users = data?.users ?? [];
    return computeGoalActuals(users, {
      ownerId: scope === "member" && memberId !== "all" ? memberId : null,
      range: "week",
    });
  }, [data, scope, memberId]);

  const goals = (data?.goals ?? []).filter((g) => {
    if (g.period !== week) return false;
    if (scope === "team") return g.member_id == null;
    if (memberId === "all") return g.member_id != null;
    return g.member_id === memberId;
  });

  if (sessionLoading || !canSeeRegion || loading) return <LoadingBlock />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="section-title text-2xl md:text-3xl">目标与达成</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            本周 {week} · 对齐 8-9 月阶段目标
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => {
              const prev = previousWeekPeriod(week);
              if (!prev) return;
              const n = await copyGoalsFromPeriod(prev, week);
              reload();
              toast.success(n ? `已从 ${prev} 复制 ${n} 条目标` : "本周目标已存在，无需复制");
            }}
          >
            从上周复制
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              downloadCsv("goals.csv", [
                ["指标", "实际", "目标", "达成率"],
                ...GOAL_METRICS.map((metric) => {
                  const goal = goals.find((g) => g.metric === metric);
                  const target = Number(goal?.target_value ?? 0);
                  const actual = actuals[metric];
                  const pct =
                    target > 0 ? Math.round((actual / target) * 100) : 0;
                  return [metric, String(actual), String(target), `${pct}%`];
                }),
              ]);
            }}
          >
            导出 CSV
          </Button>
          <Select
            className="w-28"
            value={scope}
            onChange={(e) => setScope(e.target.value as typeof scope)}
          >
            <option value="team">全队</option>
            <option value="member">按成员</option>
          </Select>
          {scope === "member" ? (
            <Select
              className="w-32"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
            >
              <option value="all">全部成员目标</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </Select>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        {GOAL_METRICS.map((metric) => {
          const goal = goals.find((g) => g.metric === metric);
          const target = Number(goal?.target_value ?? 0);
          const actual = actuals[metric];
          const pct =
            target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : 0;
          return (
            <div key={metric} className="panel space-y-3 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{metric}</p>
                <p className="text-sm tabular-nums text-[var(--muted)]">
                  实际 {actual} / 目标 {target || "—"}
                </p>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  className="max-w-[140px]"
                  defaultValue={target || ""}
                  placeholder="目标值"
                  id={`goal-${metric}`}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    const el = document.getElementById(
                      `goal-${metric}`,
                    ) as HTMLInputElement | null;
                    const value = Number(el?.value || 0);
                    await upsertGoal({
                      id: goal?.id,
                      member_id:
                        scope === "team"
                          ? null
                          : memberId === "all"
                            ? null
                            : memberId,
                      period: week,
                      metric: metric as GoalMetric,
                      target_value: value,
                    });
                    reload();
                    toast.success(`${metric} 目标已保存`);
                  }}
                >
                  保存目标
                </Button>
                <span className="text-xs text-[var(--muted)]">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

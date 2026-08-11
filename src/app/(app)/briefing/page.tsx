"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ROLE_LABEL, TRAFFIC_LABEL } from "@/lib/constants";
import { memberTrafficLight } from "@/lib/alerts";
import { exportWeeklyBriefing } from "@/lib/briefing";
import { computeGoalActuals } from "@/lib/metrics";
import { studentActivityStats } from "@/lib/students";
import { visibleMembers } from "@/lib/permissions";
import { useSession } from "@/components/providers/session-provider";
import { loadWorkbenchSnapshot } from "@/lib/data";
import { useLiveQuery } from "@/lib/data/use-live-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingBlock } from "@/components/ui/loading";

export default function BriefingPage() {
  const { profile, canSeeRegion, loading: sessionLoading } = useSession();
  const router = useRouter();

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
    return visibleMembers(profile, data.profiles).filter((m) => m.role !== "T3");
  }, [profile, data]);

  const openAlerts = (data?.alerts ?? []).filter((a) => !a.resolved);
  const actuals = data
    ? computeGoalActuals(data.users, { range: "week" })
    : null;
  const studentStats = data
    ? studentActivityStats(data.users, data.activities)
    : null;

  if (sessionLoading || !canSeeRegion || loading || !data) {
    return <LoadingBlock />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="section-title text-2xl md:text-3xl">周作战会包</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {data.period} · 红绿灯 / 预警 / 目标 / 学员活跃一键导出
          </p>
        </div>
        <Button
          onClick={() => {
            exportWeeklyBriefing({
              period: data.period,
              members,
              users: data.users,
              dailyReviews: data.dailyReviews,
              capabilities: data.capabilities,
              alerts: data.alerts,
              goals: data.goals,
              activities: data.activities,
            });
            toast.success("已开始下载 4 个 CSV");
          }}
        >
          一键导出会包
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "成员数", value: members.length },
          { label: "未处理预警", value: openAlerts.length },
          {
            label: "成交学员活跃",
            value: `${studentStats?.activeCount ?? 0}/${studentStats?.target ?? 0}`,
          },
          { label: "本周成交", value: actuals?.成交 ?? 0 },
        ].map((m) => (
          <div key={m.label} className="panel p-4">
            <p className="text-xs text-[var(--muted)]">{m.label}</p>
            <p className="mt-2 text-xl font-semibold tabular-nums">{m.value}</p>
          </div>
        ))}
      </div>

      <section className="panel overflow-hidden">
        <div className="border-b border-[var(--line)]/70 px-4 py-3 font-semibold">
          成员红绿灯速览
        </div>
        <div className="divide-y divide-[var(--line)]/70">
          {members.map((m) => {
            const { light, reasons } = memberTrafficLight({
              member: m,
              users: data.users,
              dailyReviews: data.dailyReviews,
              capabilities: data.capabilities,
              alerts: data.alerts,
            });
            return (
              <div key={m.id} className="flex items-start gap-3 px-4 py-3">
                <Badge
                  className={
                    light === "red"
                      ? "bg-rose-100 text-rose-800"
                      : light === "yellow"
                        ? "bg-amber-100 text-amber-900"
                        : "bg-emerald-100 text-emerald-800"
                  }
                >
                  {TRAFFIC_LABEL[light]}
                </Badge>
                <div>
                  <p className="font-medium">
                    {m.full_name}{" "}
                    <span className="text-xs text-[var(--muted)]">
                      {ROLE_LABEL[m.role]}
                      {m.area ? ` · ${m.area}` : ""}
                    </span>
                  </p>
                  <p className="text-xs text-[var(--muted)]">{reasons[0]}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel p-4">
        <h2 className="mb-3 font-semibold">
          未处理预警 Top {Math.min(8, openAlerts.length)}
        </h2>
        <div className="space-y-2">
          {openAlerts.slice(0, 8).map((a) => (
            <p key={a.alert_key} className="text-sm text-[var(--ink-soft)]">
              <span className={a.level === "red" ? "text-rose-700" : "text-amber-800"}>
                [{a.level === "red" ? "红" : "黄"}]
              </span>{" "}
              {a.alert_type} · {a.member_name}
              {a.user_name ? ` / ${a.user_name}` : ""} · {a.reason}
            </p>
          ))}
          {openAlerts.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">本周无未处理预警</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

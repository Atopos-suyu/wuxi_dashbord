"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FUNNEL_STAGES } from "@/lib/constants";
import { useSession } from "@/components/providers/session-provider";
import {
  listUsersFor,
  loadDemoDB,
  upsertWeekly,
} from "@/lib/demo/store";
import { useDemoTick } from "@/lib/demo/use-demo-db";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { currentWeekPeriod, downloadCsv, weekStartISO } from "@/lib/utils";

export default function WeeklyReviewPage() {
  const { profile, isT0 } = useSession();
  useDemoTick();

  const weekStart = weekStartISO();
  const weekPeriod = currentWeekPeriod();
  const db = loadDemoDB();
  const users = profile ? listUsersFor(profile) : [];

  const funnelSnapshot = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of FUNNEL_STAGES) {
      map[s] = users.filter((u) => u.stage === s).length;
    }
    return map;
  }, [users]);

  const capability =
    db.capabilities.find(
      (c) => c.member_id === profile?.id && c.period === weekPeriod,
    )?.scores ?? null;

  const existing = db.weeklyReviews.find(
    (w) => w.member_id === profile?.id && w.week_start === weekStart,
  );

  const [summary, setSummary] = useState(existing?.summary ?? "");
  const [planNext, setPlanNext] = useState(existing?.plan_next ?? "");

  const allWeekly = db.weeklyReviews
    .filter((w) => (isT0 ? true : w.member_id === profile?.id))
    .sort((a, b) => b.week_start.localeCompare(a.week_start));

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="section-title text-2xl md:text-3xl">每周复盘</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            周起始 {weekStart} · 自动带出漏斗与能力快照
          </p>
        </div>
        {isT0 ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              downloadCsv("weekly-reviews.csv", [
                ["成员", "周起始", "总结", "下周计划"],
                ...allWeekly.map((w) => [
                  db.profiles.find((p) => p.id === w.member_id)?.full_name ?? "",
                  w.week_start,
                  w.summary,
                  w.plan_next,
                ]),
              ]);
            }}
          >
            导出周报
          </Button>
        ) : null}
      </div>

      <section className="panel p-4">
        <h2 className="font-semibold">本周漏斗快照</h2>
        <div className="mt-3 grid grid-cols-4 gap-2 md:grid-cols-7">
          {Object.entries(funnelSnapshot).map(([stage, count]) => (
            <div
              key={stage}
              className="rounded-xl bg-[var(--surface-2)] px-2 py-3 text-center"
            >
              <p className="text-[11px] text-[var(--muted)]">{stage}</p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold">
                {count}
              </p>
            </div>
          ))}
        </div>
      </section>

      <form
        className="panel space-y-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!profile) return;
          upsertWeekly({
            member_id: profile.id,
            week_start: weekStart,
            summary,
            funnel_summary: funnelSnapshot,
            capability_snapshot: capability,
            plan_next: planNext,
          });
          toast.success(existing ? "周报已更新" : "周报已生成");
        }}
      >
        <div className="space-y-2">
          <Label>本周总结</Label>
          <Textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="招新群 / 面试 / A类 / 成交，对齐业务目标"
          />
        </div>
        <div className="space-y-2">
          <Label>下周计划</Label>
          <Textarea
            value={planNext}
            onChange={(e) => setPlanNext(e.target.value)}
          />
        </div>
        {capability ? (
          <p className="text-xs text-[var(--muted)]">
            已附带本周能力评分快照（{weekPeriod}）
          </p>
        ) : (
          <p className="text-xs text-[var(--muted)]">
            本周尚无能力评分，T0 可在成员详情补录
          </p>
        )}
        <Button className="w-full" type="submit">
          {existing ? "更新本周周报" : "生成本周周报"}
        </Button>
      </form>

      {isT0 ? (
        <section className="space-y-3">
          <h2 className="font-semibold">周报总览</h2>
          {allWeekly.map((w) => {
            const member = db.profiles.find((p) => p.id === w.member_id);
            const deals = w.funnel_summary?.["成交"] ?? 0;
            const interviews = w.funnel_summary?.["面试"] ?? 0;
            return (
              <article key={w.id} className="panel p-4">
                <p className="font-semibold">
                  {member?.full_name} · {w.week_start}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  面试 {interviews} · 成交 {deals} · A类目标对齐看总结
                </p>
                <p className="mt-2 text-sm">{w.summary || "（未写总结）"}</p>
                <p className="mt-1 text-sm text-[var(--ink-soft)]">
                  下周：{w.plan_next || "—"}
                </p>
              </article>
            );
          })}
        </section>
      ) : null}
    </div>
  );
}

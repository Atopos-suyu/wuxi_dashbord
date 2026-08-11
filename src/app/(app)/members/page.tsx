"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CAPABILITY_KEYS,
  MEMBER_STATUS_LABEL,
  type CapabilityScores,
} from "@/lib/constants";
import { useSession } from "@/components/providers/session-provider";
import { loadWorkbenchSnapshot } from "@/lib/data";
import { useLiveQuery } from "@/lib/data/use-live-query";
import { ScoreRadar } from "@/components/charts/radar-chart";
import { Badge } from "@/components/ui/badge";
import { LoadingBlock } from "@/components/ui/loading";
import { currentWeekPeriod, recentDays } from "@/lib/utils";

export default function MembersPage() {
  const { profile, isT0, loading: sessionLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!sessionLoading && !isT0) router.replace("/users");
  }, [sessionLoading, isT0, router]);

  const { data, loading } = useLiveQuery(
    async () =>
      profile && isT0 ? loadWorkbenchSnapshot(profile) : null,
    [profile?.id, isT0],
  );

  if (sessionLoading || !isT0 || !profile || loading) return <LoadingBlock />;

  const members = (data?.profiles ?? []).filter((p) => p.role !== "T0");
  const users = data?.users ?? [];
  const capabilities = data?.capabilities ?? [];
  const dailyReviews = data?.dailyReviews ?? [];
  const week = currentWeekPeriod();
  const last3 = recentDays(3);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="section-title text-2xl md:text-3xl">成员看板</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          能力雷达 + 状态预警，判断谁该重点培养
        </p>
      </div>

      <div className="stagger grid gap-4 md:grid-cols-2">
        {members.map((m) => {
          const mine = users.filter((u) => u.owner_id === m.id);
          const caps = capabilities
            .filter((c) => c.member_id === m.id)
            .sort((a, b) => a.period.localeCompare(b.period));
          const latest = caps.find((c) => c.period === week) ?? caps.at(-1);
          const prev = caps.length > 1 ? caps[caps.length - 2] : null;
          const missingDaily = last3.every(
            (d) =>
              !dailyReviews.some(
                (r) => r.member_id === m.id && r.review_date === d,
              ),
          );
          const sliding =
            latest &&
            prev &&
            CAPABILITY_KEYS.filter(
              (k) => (latest.scores[k] ?? 0) < (prev.scores[k] ?? 0),
            ).length >= 2;

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
                    {m.role} · 用户 {mine.length} · A/S{" "}
                    {
                      mine.filter((u) => u.level === "A" || u.level === "S")
                        .length
                    }{" "}
                    · 成交 {mine.filter((u) => u.stage === "成交").length}
                  </p>
                </div>
                <Badge
                  className={
                    m.status === "active"
                      ? "bg-emerald-100 text-emerald-800"
                      : m.status === "pending"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-rose-100 text-rose-800"
                  }
                >
                  {MEMBER_STATUS_LABEL[m.status]}
                </Badge>
              </div>

              {(missingDaily || sliding) && (
                <div className="mt-3 space-y-1 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {missingDaily ? <p>预警：近 3 天未填日报</p> : null}
                  {sliding ? <p>预警：连续能力维度下滑</p> : null}
                </div>
              )}

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

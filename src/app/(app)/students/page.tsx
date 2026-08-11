"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ACTIVITY_TYPES,
  ALERT_THRESHOLDS,
  type ActivityType,
} from "@/lib/constants";
import {
  isStudentActive,
  studentActivityStats,
  studentInactiveDays,
} from "@/lib/students";
import { useSession } from "@/components/providers/session-provider";
import {
  addStudentActivity,
  loadWorkbenchSnapshot,
} from "@/lib/data";
import { useLiveQuery } from "@/lib/data/use-live-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty";
import { LoadingBlock } from "@/components/ui/loading";
import { formatDateTime } from "@/lib/utils";

export default function StudentsPage() {
  const { profile, canSeeMembers, loading: sessionLoading } = useSession();
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [activityType, setActivityType] = useState<ActivityType>("社群互动");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!sessionLoading && !canSeeMembers) router.replace("/users");
  }, [sessionLoading, canSeeMembers, router]);

  const { data, loading, reload } = useLiveQuery(
    async () =>
      profile && canSeeMembers ? loadWorkbenchSnapshot(profile) : null,
    [profile?.id, canSeeMembers],
  );

  const stats = useMemo(() => {
    if (!data) return null;
    return studentActivityStats(data.users, data.activities);
  }, [data]);

  useEffect(() => {
    if (!userId && stats?.deals[0]) setUserId(stats.deals[0].id);
  }, [stats, userId]);

  if (sessionLoading || !canSeeMembers || loading || !stats) {
    return <LoadingBlock />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="section-title text-2xl md:text-3xl">成交学员活跃</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          对齐 9 月仍活跃 {ALERT_THRESHOLDS.studentActiveTarget}+ · 超过{" "}
          {ALERT_THRESHOLDS.studentInactiveDays} 天无互动视为需召回
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "成交学员", value: stats.deals.length },
          { label: "当前活跃", value: stats.activeCount },
          { label: "需召回", value: stats.needRecall.length },
          { label: "活跃目标", value: stats.target },
        ].map((m) => (
          <div key={m.label} className="panel p-4">
            <p className="text-xs text-[var(--muted)]">{m.label}</p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums">
              {m.value}
            </p>
          </div>
        ))}
      </div>

      <section className="panel space-y-3 p-4">
        <h2 className="font-semibold">登记一次活跃</h2>
        {stats.deals.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">暂无成交学员</p>
        ) : (
          <>
            <div className="grid gap-2 md:grid-cols-3">
              <Select value={userId} onChange={(e) => setUserId(e.target.value)}>
                {stats.deals.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
              <Select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value as ActivityType)}
              >
                {ACTIVITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
              <Input
                placeholder="备注（可选）"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              onClick={async () => {
                if (!profile || !userId) return;
                await addStudentActivity({
                  user_id: userId,
                  activity_type: activityType,
                  note,
                  happened_at: new Date().toISOString(),
                  recorded_by: profile.id,
                });
                setNote("");
                reload();
                toast.success("已登记活跃");
              }}
            >
              提交
            </Button>
          </>
        )}
      </section>

      {stats.deals.length === 0 ? (
        <EmptyState title="暂无成交学员" description="用户进入「成交」阶段后会出现在这里" />
      ) : (
        <div className="space-y-3">
          {stats.deals.map((u) => {
            const active = isStudentActive(u);
            const days = studentInactiveDays(u);
            return (
              <article key={u.id} className="panel p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <Link
                      href={`/users/${u.id}`}
                      className="font-semibold text-[var(--lake)]"
                    >
                      {u.name}
                    </Link>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {u.contact || "无联系方式"} · 未互动 {days} 天
                    </p>
                  </div>
                  <Badge
                    className={
                      active
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }
                  >
                    {active ? "活跃" : "需召回"}
                  </Badge>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <section className="space-y-2">
        <h2 className="font-semibold">最近活跃记录</h2>
        {stats.recent.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">暂无记录</p>
        ) : (
          stats.recent.map((a) => {
            const user = stats.deals.find((u) => u.id === a.user_id);
            return (
              <div key={a.id} className="panel px-4 py-3 text-sm">
                <span className="font-medium">{user?.name ?? a.user_id}</span>
                {" · "}
                {a.activity_type}
                {a.note ? ` · ${a.note}` : ""}
                <span className="ml-2 text-xs text-[var(--muted)]">
                  {formatDateTime(a.happened_at)}
                </span>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}

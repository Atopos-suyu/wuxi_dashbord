"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ALERT_TYPES, AREAS } from "@/lib/constants";
import { computeAlerts } from "@/lib/alerts";
import { useSession } from "@/components/providers/session-provider";
import { loadWorkbenchSnapshot, resolveAlert } from "@/lib/data";
import { useLiveQuery } from "@/lib/data/use-live-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty";
import { LoadingBlock } from "@/components/ui/loading";
import { downloadCsv } from "@/lib/utils";

export default function AlertsPage() {
  const { profile, canSeeRegion, loading: sessionLoading } = useSession();
  const router = useRouter();
  const [type, setType] = useState("all");
  const [level, setLevel] = useState("all");
  const [area, setArea] = useState("all");
  const [note, setNote] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!sessionLoading && !canSeeRegion) router.replace("/users");
  }, [sessionLoading, canSeeRegion, router]);

  const { data, loading, reload } = useLiveQuery(
    async () =>
      profile && canSeeRegion ? loadWorkbenchSnapshot(profile) : null,
    [profile?.id, canSeeRegion],
  );

  const alerts = useMemo(() => {
    if (!data) return [];
    const all = computeAlerts({
      members: data.profiles,
      users: data.users,
      dailyReviews: data.dailyReviews,
      capabilities: data.capabilities,
      resolutions: data.resolutions,
      attitudeLogs: data.attitudeLogs,
      goals: data.goals,
      period: data.period,
    });
    return all.filter((a) => {
      if (a.resolved) return false;
      if (type !== "all" && a.alert_type !== type) return false;
      if (level !== "all" && a.level !== level) return false;
      if (area !== "all") {
        const m = data.profiles.find((p) => p.id === a.member_id);
        if (m?.area !== area) return false;
      }
      return true;
    });
  }, [data, type, level, area]);

  if (sessionLoading || !canSeeRegion || loading) return <LoadingBlock />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="section-title text-2xl md:text-3xl">预警中心</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            未处理 <span className="font-semibold text-[var(--accent)]">{alerts.length}</span>{" "}
            条 · 去跟进 → 标记处理形成闭环
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            downloadCsv("alerts.csv", [
              ["级别", "类型", "成员", "用户", "联系方式", "原因"],
              ...alerts.map((a) => [
                a.level,
                a.alert_type,
                a.member_name,
                a.user_name ?? "",
                a.contact ?? "",
                a.reason,
              ]),
            ]);
          }}
        >
          导出 CSV
        </Button>
      </div>

      <div className="panel grid grid-cols-1 gap-2 p-3 md:grid-cols-3">
        <Select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="all">全部类型</option>
          {ALERT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <Select value={level} onChange={(e) => setLevel(e.target.value)}>
          <option value="all">全部级别</option>
          <option value="red">红色</option>
          <option value="yellow">黄色</option>
        </Select>
        <Select value={area} onChange={(e) => setArea(e.target.value)}>
          <option value="all">全部片区</option>
          {AREAS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>
      </div>

      {alerts.length === 0 ? (
        <EmptyState title="暂无未处理预警" description="当前筛选条件下没有待处理项" />
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => (
            <article key={a.alert_key} className="panel space-y-3 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  className={
                    a.level === "red"
                      ? "bg-rose-100 text-rose-800"
                      : "bg-amber-100 text-amber-900"
                  }
                >
                  {a.level === "red" ? "红" : "黄"} · {a.alert_type}
                </Badge>
                <span className="font-medium">{a.member_name}</span>
                {a.user_name ? (
                  <span className="text-sm text-[var(--muted)]">
                    / 用户 {a.user_name}
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-[var(--ink-soft)]">{a.reason}</p>
              {a.contact ? (
                <p className="text-xs text-[var(--muted)]">
                  联系方式：{a.contact}{" "}
                  <button
                    type="button"
                    className="text-[var(--lake)] underline"
                    onClick={async () => {
                      await navigator.clipboard.writeText(a.contact || "");
                      toast.success("已复制联系方式");
                    }}
                  >
                    复制
                  </button>
                </p>
              ) : null}
              <Input
                placeholder="处理备注（可选）"
                value={note[a.alert_key] ?? ""}
                onChange={(e) =>
                  setNote({ ...note, [a.alert_key]: e.target.value })
                }
              />
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link
                    href={
                      a.user_id
                        ? `/users/${a.user_id}`
                        : `/members/${a.member_id}`
                    }
                  >
                    去跟进
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    if (!profile) return;
                    await resolveAlert({
                      alert_key: a.alert_key,
                      member_id: a.member_id,
                      user_id: a.user_id ?? null,
                      alert_type: a.alert_type,
                      level: a.level,
                      note: note[a.alert_key] ?? "",
                      handled_by: profile.id,
                    });
                    reload();
                    toast.success("已标记处理");
                  }}
                >
                  标记已处理
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { format, subDays } from "date-fns";
import { toast } from "sonner";
import {
  CAPABILITY_KEYS,
  DEFAULT_CAPABILITY_SCORES,
  MEMBER_STATUSES,
  MEMBER_STATUS_LABEL,
  ROLE_LABEL,
  TRAFFIC_LABEL,
  type CapabilityScores,
  type MemberStatus,
} from "@/lib/constants";
import { computeAlerts, memberTrafficLight } from "@/lib/alerts";
import { useSession } from "@/components/providers/session-provider";
import {
  listCapabilities,
  listDailyReviews,
  listGoals,
  listAttitudeLogs,
  listProfiles,
  listUsersFor,
  listResolutions,
  updateProfile,
  upsertCapability,
} from "@/lib/data";
import { useLiveQuery } from "@/lib/data/use-live-query";
import { ScoreRadar } from "@/components/charts/radar-chart";
import { TrendLine } from "@/components/charts/trend-line";
import { LevelBadge } from "@/components/users/level-badge";
import { StageBadge } from "@/components/users/stage-badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty";
import { LoadingBlock } from "@/components/ui/loading";
import { currentWeekPeriod } from "@/lib/utils";

export default function MemberDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { profile, canSeeMembers, loading: sessionLoading } = useSession();
  const week = currentWeekPeriod();

  useEffect(() => {
    if (!sessionLoading && !canSeeMembers) router.replace("/users");
  }, [sessionLoading, canSeeMembers, router]);

  const { data: profiles = [], loading: pLoading, reload: reloadProfiles } =
    useLiveQuery(() => listProfiles(), []);
  const { data: caps = [], loading: cLoading, reload: reloadCaps } =
    useLiveQuery(() => listCapabilities(params.id), [params.id]);
  const { data: users = [], loading: uLoading } = useLiveQuery(
    async () => (profile ? listUsersFor(profile) : []),
    [profile?.id],
  );
  const { data: daily = [] } = useLiveQuery(() => listDailyReviews(), []);
  const { data: resolutions = [] } = useLiveQuery(() => listResolutions(), []);
  const { data: attitudeLogs = [] } = useLiveQuery(() => listAttitudeLogs(), []);
  const { data: goals = [] } = useLiveQuery(() => listGoals(), []);

  const member = profiles.find((p) => p.id === params.id);
  const mine = users.filter((u) => u.owner_id === params.id);
  const sortedCaps = useMemo(
    () => [...caps].sort((a, b) => a.period.localeCompare(b.period)),
    [caps],
  );
  const latest = sortedCaps.find((c) => c.period === week) ?? sortedCaps.at(-1);
  const prev = sortedCaps.length >= 2 ? sortedCaps[sortedCaps.length - 2] : null;

  const [scores, setScores] = useState<CapabilityScores>(DEFAULT_CAPABILITY_SCORES);
  const [note, setNote] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [compareMode, setCompareMode] = useState(true);

  useEffect(() => {
    if (latest && !hydrated) {
      setScores(latest.scores);
      setNote(latest.review_note);
      setHydrated(true);
    }
  }, [latest, hydrated]);

  const alerts = useMemo(() => {
    if (!member) return [];
    return computeAlerts({
      members: profiles,
      users,
      dailyReviews: daily,
      capabilities: caps,
      resolutions,
      attitudeLogs,
      goals,
      period: week,
    }).filter((a) => a.member_id === member.id && !a.resolved);
  }, [member, profiles, users, daily, caps, resolutions, attitudeLogs, goals, week]);

  const light = member
    ? memberTrafficLight({
        member,
        users,
        dailyReviews: daily,
        capabilities: caps,
        alerts,
      })
    : null;

  const last7 = Array.from({ length: 7 }, (_, i) =>
    format(subDays(new Date(), 6 - i), "yyyy-MM-dd"),
  );

  const compareRadar = useMemo(
    () =>
      CAPABILITY_KEYS.map((k) => ({
        subject: k.slice(0, 2),
        current: scores[k],
        prev: prev?.scores[k] ?? 0,
      })),
    [scores, prev],
  );

  const trend = sortedCaps.slice(-8).map((c) => {
    const avg =
      CAPABILITY_KEYS.reduce((sum, k) => sum + (c.scores[k] ?? 0), 0) /
      CAPABILITY_KEYS.length;
    return {
      period: c.period.replace(/^\d+-/, ""),
      avg: Math.round(avg * 10) / 10,
      关单转化: c.scores["关单转化"],
      复盘数据: c.scores["复盘数据"],
    };
  });

  if (sessionLoading || !canSeeMembers || pLoading || cLoading || uLoading) {
    return <LoadingBlock />;
  }
  if (!member || !light) return <EmptyState title="成员不存在或无权查看" />;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="section-title text-2xl md:text-3xl">
            {member.full_name}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {ROLE_LABEL[member.role]}
            {member.area ? ` · ${member.area}` : ""} ·{" "}
            {TRAFFIC_LABEL[light.light]}
          </p>
        </div>
        {(profile?.role === "T3" || profile?.role === "T2") && (
          <Select
            className="w-32"
            value={member.status}
            onChange={async (e) => {
              await updateProfile(member.id, {
                status: e.target.value as MemberStatus,
              });
              reloadProfiles();
              toast.success("状态已更新");
            }}
          >
            {MEMBER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {MEMBER_STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        )}
      </div>

      <section className="panel p-4">
        <h2 className="mb-2 font-semibold">红绿灯详情</h2>
        <ul className="space-y-1 text-sm text-[var(--ink-soft)]">
          {light.reasons.map((r) => (
            <li key={r}>· {r}</li>
          ))}
        </ul>
        {alerts.length ? (
          <div className="mt-3 space-y-2">
            {alerts.map((a) => (
              <div
                key={a.alert_key}
                className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700"
              >
                {a.alert_type}：{a.reason}
                {a.user_id ? (
                  <Link
                    className="ml-2 underline"
                    href={`/users/${a.user_id}`}
                  >
                    去跟进
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="panel p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">该成员用户（{mine.length}）</h2>
        </div>
        {mine.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">暂无用户</p>
        ) : (
          <div className="space-y-2">
            {mine.map((u) => (
              <Link
                key={u.id}
                href={`/users/${u.id}`}
                className="flex items-center justify-between rounded-xl bg-[var(--surface-2)] px-3 py-2"
              >
                <span className="font-medium">{u.name}</span>
                <span className="flex gap-1">
                  <LevelBadge level={u.level} />
                  <StageBadge stage={u.stage} />
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="panel p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">
            能力趋势（{prev?.period ?? "—"} vs {week}）
          </h2>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setCompareMode((v) => !v)}
          >
            {compareMode ? "仅本周" : "对比上周"}
          </Button>
        </div>
        <ScoreRadar
          data={compareRadar}
          series={
            compareMode
              ? [
                  { key: "prev", color: "#94A3B8", name: "上期" },
                  { key: "current", color: "#E07A3D", name: "本周" },
                ]
              : [{ key: "current", color: "#E07A3D", name: "本周" }]
          }
        />
        {trend.length ? (
          <div className="mt-4">
            <TrendLine
              data={trend}
              lines={[
                { key: "avg", color: "#1F6B8A", name: "均分" },
                { key: "关单转化", color: "#E07A3D", name: "关单" },
              ]}
            />
          </div>
        ) : null}
      </section>

      <section className="panel p-4">
        <h2 className="mb-3 font-semibold">近 7 天日报</h2>
        <div className="space-y-2">
          {last7.map((d) => {
            const row = daily.find(
              (r) => r.member_id === member.id && r.review_date === d,
            );
            return (
              <details
                key={d}
                className={`rounded-xl px-3 py-2 ${
                  row ? "bg-[var(--surface-2)]" : "bg-rose-50"
                }`}
              >
                <summary className="cursor-pointer text-sm font-medium">
                  {d}{" "}
                  {row ? (
                    <Badge className="ml-2 bg-emerald-100 text-emerald-800">
                      已填
                    </Badge>
                  ) : (
                    <Badge className="ml-2 bg-rose-100 text-rose-800">
                      漏填
                    </Badge>
                  )}
                </summary>
                {row ? (
                  <div className="mt-2 space-y-1 text-xs text-[var(--ink-soft)]">
                    <p>
                      加人 {row.new_contacts} · A {row.new_a} · 私聊{" "}
                      {row.private_chats} · 跟进 {row.stage_followups}
                    </p>
                    {row.highlights ? <p>亮点：{row.highlights}</p> : null}
                    {row.problems ? <p>问题：{row.problems}</p> : null}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-rose-700">当天未提交日报</p>
                )}
              </details>
            );
          })}
        </div>
      </section>

      {(profile?.role === "T3" || profile?.role === "T2") && (
        <section className="panel space-y-4 p-4">
          <h2 className="font-semibold">本周打分 · {week}</h2>
          {CAPABILITY_KEYS.map((key) => (
            <div key={key} className="flex items-center gap-3">
              <Label className="w-24 shrink-0 text-sm">{key}</Label>
              <input
                type="range"
                min={1}
                max={5}
                value={scores[key]}
                className="flex-1 accent-[var(--accent)]"
                onChange={(e) =>
                  setScores({ ...scores, [key]: Number(e.target.value) })
                }
              />
              <span className="w-4 font-semibold">{scores[key]}</span>
            </div>
          ))}
          <div className="space-y-2">
            <Label>点评</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <Button
            className="w-full"
            onClick={async () => {
              await upsertCapability({
                member_id: member.id,
                period: week,
                scores,
                review_note: note,
              });
              reloadCaps();
              toast.success("能力评分已保存");
            }}
          >
            保存本周评分
          </Button>
        </section>
      )}
    </div>
  );
}

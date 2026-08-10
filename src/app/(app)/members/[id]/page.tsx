"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CAPABILITY_KEYS,
  DEFAULT_CAPABILITY_SCORES,
  MEMBER_STATUSES,
  MEMBER_STATUS_LABEL,
  type CapabilityScores,
  type MemberStatus,
} from "@/lib/constants";
import { useSession } from "@/components/providers/session-provider";
import {
  loadDemoDB,
  updateProfile,
  upsertCapability,
} from "@/lib/demo/store";
import { useDemoTick } from "@/lib/demo/use-demo-db";
import { ScoreRadar } from "@/components/charts/radar-chart";
import { TrendLine } from "@/components/charts/trend-line";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty";
import { LoadingBlock } from "@/components/ui/loading";
import { currentWeekPeriod } from "@/lib/utils";

export default function MemberDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { isT0, loading } = useSession();
  const tick = useDemoTick();
  const week = currentWeekPeriod();

  const db = useMemo(() => loadDemoDB(), [tick]);
  const member = db.profiles.find((p) => p.id === params.id);
  const caps = useMemo(
    () =>
      db.capabilities
        .filter((c) => c.member_id === params.id)
        .sort((a, b) => a.period.localeCompare(b.period)),
    [db, params.id],
  );
  const latest = caps.find((c) => c.period === week) ?? caps.at(-1);
  const prev = caps.length >= 2 ? caps[caps.length - 2] : null;

  const [scores, setScores] = useState<CapabilityScores>(
    DEFAULT_CAPABILITY_SCORES,
  );
  const [note, setNote] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!loading && !isT0) router.replace("/users");
  }, [loading, isT0, router]);

  useEffect(() => {
    if (latest && !hydrated) {
      setScores(latest.scores);
      setNote(latest.review_note);
      setHydrated(true);
    }
  }, [latest, hydrated]);

  const compareRadar = useMemo(
    () =>
      CAPABILITY_KEYS.map((k) => ({
        subject: k.slice(0, 2),
        current: scores[k],
        prev: prev?.scores[k] ?? 0,
      })),
    [scores, prev],
  );

  const trend = caps.slice(-8).map((c) => {
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

  if (loading || !isT0) return <LoadingBlock />;
  if (!member) return <EmptyState title="成员不存在" />;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="section-title text-2xl md:text-3xl">
            {member.full_name}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {member.role} · {member.school_region}
          </p>
        </div>
        <Select
          className="w-32"
          value={member.status}
          onChange={(e) => {
            updateProfile(member.id, {
              status: e.target.value as MemberStatus,
            });
            toast.success("状态已更新");
          }}
        >
          {MEMBER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {MEMBER_STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
      </div>

      <section className="panel p-4">
        <h2 className="mb-2 font-semibold">
          能力对比（{prev?.period ?? "—"} vs 本周 {week}）
        </h2>
        <ScoreRadar
          data={compareRadar}
          series={[
            { key: "prev", color: "#94A3B8", name: "上周/上期" },
            { key: "current", color: "#E07A3D", name: "本周" },
          ]}
        />
      </section>

      <section className="panel p-4">
        <h2 className="mb-2 font-semibold">近 8 周趋势</h2>
        {trend.length ? (
          <TrendLine
            data={trend}
            lines={[
              { key: "avg", color: "#1F6B8A", name: "均分" },
              { key: "关单转化", color: "#E07A3D", name: "关单" },
              { key: "复盘数据", color: "#0B6E4F", name: "复盘" },
            ]}
          />
        ) : (
          <p className="text-sm text-[var(--muted)]">暂无历史评分</p>
        )}
      </section>

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
          onClick={() => {
            upsertCapability({
              member_id: member.id,
              period: week,
              scores,
              review_note: note,
            });
            toast.success("能力评分已保存");
          }}
        >
          保存本周评分
        </Button>
      </section>
    </div>
  );
}

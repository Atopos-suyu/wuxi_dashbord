"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AREAS,
  SCHOOL_REGIONS,
  type SchoolRegion,
} from "@/lib/constants";
import {
  filterProfilesByCampus,
  filterUsersByCampus,
  visibleMembers,
} from "@/lib/permissions";
import {
  funnelConversion,
  funnelStock,
  groupByKey,
} from "@/lib/funnel";
import { useSession } from "@/components/providers/session-provider";
import { loadWorkbenchSnapshot } from "@/lib/data";
import { useLiveQuery } from "@/lib/data/use-live-query";
import { FunnelBars } from "@/components/charts/funnel-bars";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LoadingBlock } from "@/components/ui/loading";
import { downloadCsv } from "@/lib/utils";
import type { Stage } from "@/lib/constants";

export default function FunnelPage() {
  const { profile, canSeeRegion, loading: sessionLoading } = useSession();
  const router = useRouter();
  const [campus, setCampus] = useState<SchoolRegion | "all">("all");
  const [area, setArea] = useState("all");

  useEffect(() => {
    if (!sessionLoading && !canSeeRegion) router.replace("/users");
  }, [sessionLoading, canSeeRegion, router]);

  useEffect(() => {
    if (profile?.role !== "T3" && profile?.school_region) {
      setCampus(profile.school_region as SchoolRegion);
    }
  }, [profile?.id, profile?.role, profile?.school_region]);

  const { data, loading } = useLiveQuery(
    async () =>
      profile && canSeeRegion ? loadWorkbenchSnapshot(profile) : null,
    [profile?.id, canSeeRegion],
  );

  const scopedUsers = useMemo(() => {
    if (!data || !profile) return [];
    let users = filterUsersByCampus(data.users, campus, data.profiles);
    if (area !== "all") users = users.filter((u) => u.area === area);
    // 非 T3 已由 listUsersFor 限制；此处再按可见成员收口
    const ids = new Set(
      visibleMembers(profile, filterProfilesByCampus(data.profiles, campus)).map(
        (p) => p.id,
      ),
    );
    return users.filter((u) => ids.has(u.owner_id));
  }, [data, profile, campus, area]);

  const stock = funnelStock(scopedUsers);
  const conv = funnelConversion(scopedUsers);

  const byCampus = useMemo(() => {
    if (!data) return [];
    return SCHOOL_REGIONS.map((c) => {
      const users = filterUsersByCampus(data.users, c, data.profiles);
      const cnv = funnelConversion(users);
      return {
        campus: c,
        total: users.length,
        dealRate: cnv.dealRate,
        lost: cnv.lost,
        interview: users.filter((u) =>
          ["面试", "关系铺垫", "职规", "产品", "关单", "成交"].includes(u.stage),
        ).length,
      };
    });
  }, [data]);

  const byArea = useMemo(() => {
    const map = groupByKey(scopedUsers, (u) => u.area || "未分");
    return AREAS.map((a) => {
      const users = map.get(a) ?? [];
      const cnv = funnelConversion(users);
      return { area: a, total: users.length, dealRate: cnv.dealRate, lost: cnv.lost };
    }).filter((r) => r.total > 0);
  }, [scopedUsers]);

  if (sessionLoading || !canSeeRegion || loading || !data) {
    return <LoadingBlock />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="section-title text-2xl md:text-3xl">漏斗诊断</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            阶段转化率 · 校区对比 · 专业片区对比
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {profile?.role === "T3" ? (
            <Select
              className="w-40"
              value={campus}
              onChange={(e) =>
                setCampus(e.target.value as SchoolRegion | "all")
              }
            >
              <option value="all">全部校区</option>
              {SCHOOL_REGIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          ) : (
            <Select className="w-40" value={campus} disabled>
              <option value={campus}>{campus}</option>
            </Select>
          )}
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
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              downloadCsv("funnel-conversion.csv", [
                ["从", "到", "到达从", "到达到", "转化率%"],
                ...conv.rows.map((r) => [
                  r.from,
                  r.to,
                  String(r.fromCount),
                  String(r.toCount),
                  r.rate == null ? "" : String(r.rate),
                ]),
              ]);
            }}
          >
            导出 CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "样本用户", value: conv.total },
          { label: "整体成交率", value: `${conv.dealRate}%` },
          { label: "流失", value: conv.lost },
          {
            label: "关单人数",
            value: scopedUsers.filter((u) => u.stage === "关单").length,
          },
        ].map((m) => (
          <div key={m.label} className="panel p-4">
            <p className="text-xs text-[var(--muted)]">{m.label}</p>
            <p className="mt-2 text-xl font-semibold tabular-nums">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel p-4">
          <h2 className="mb-4 font-semibold">阶段存量</h2>
          <FunnelBars
            data={stock.map((s) => ({
              stage: s.stage as Stage,
              count: s.count,
            }))}
          />
        </section>
        <section className="panel p-4">
          <h2 className="mb-3 font-semibold">阶段转化率</h2>
          <div className="space-y-3">
            {conv.rows.map((r) => (
              <div key={`${r.from}-${r.to}`}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>
                    {r.from} → {r.to}
                  </span>
                  <span className="tabular-nums text-[var(--muted)]">
                    {r.toCount}/{r.fromCount} ·{" "}
                    {r.rate == null ? "—" : `${r.rate}%`}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
                  <div
                    className="h-full rounded-full bg-[var(--lake)]"
                    style={{ width: `${Math.min(100, r.rate ?? 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel overflow-hidden">
        <div className="border-b border-[var(--line)]/70 px-4 py-3 font-semibold">
          流失原因分布
        </div>
        {conv.lossByReason.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[var(--muted)]">当前筛选下无流失用户</p>
        ) : (
          <div className="space-y-3 p-4">
            {conv.lossByReason.map((r) => {
              const pct =
                conv.lost > 0 ? Math.round((r.count / conv.lost) * 100) : 0;
              return (
                <div key={r.reason}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{r.reason}</span>
                    <span className="tabular-nums text-[var(--muted)]">
                      {r.count} · {pct}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
                    <div
                      className="h-full rounded-full bg-[var(--ink-soft)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-[var(--line)]/70 px-4 py-3 font-semibold">
          校区对比
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--surface-2)] text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">校区</th>
                <th className="px-4 py-3 font-medium">用户</th>
                <th className="px-4 py-3 font-medium">面试+</th>
                <th className="px-4 py-3 font-medium">成交率</th>
                <th className="px-4 py-3 font-medium">流失</th>
              </tr>
            </thead>
            <tbody>
              {byCampus.map((r) => (
                <tr key={r.campus} className="border-t border-[var(--line)]/70">
                  <td className="px-4 py-3 font-medium">{r.campus}</td>
                  <td className="px-4 py-3 tabular-nums">{r.total}</td>
                  <td className="px-4 py-3 tabular-nums">{r.interview}</td>
                  <td className="px-4 py-3 tabular-nums">{r.dealRate}%</td>
                  <td className="px-4 py-3 tabular-nums">{r.lost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-[var(--line)]/70 px-4 py-3 font-semibold">
          专业片区对比（当前校区筛选下）
        </div>
        {byArea.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[var(--muted)]">暂无数据</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--surface-2)] text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">片区</th>
                  <th className="px-4 py-3 font-medium">用户</th>
                  <th className="px-4 py-3 font-medium">成交率</th>
                  <th className="px-4 py-3 font-medium">流失</th>
                </tr>
              </thead>
              <tbody>
                {byArea.map((r) => (
                  <tr key={r.area} className="border-t border-[var(--line)]/70">
                    <td className="px-4 py-3 font-medium">{r.area}</td>
                    <td className="px-4 py-3 tabular-nums">{r.total}</td>
                    <td className="px-4 py-3 tabular-nums">{r.dealRate}%</td>
                    <td className="px-4 py-3 tabular-nums">{r.lost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

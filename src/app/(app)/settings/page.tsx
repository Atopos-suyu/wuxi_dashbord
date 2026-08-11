"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { STAGES_REQUIRE_RECORDING } from "@/lib/constants";
import { countOpenAlerts } from "@/lib/alerts";
import { useSession } from "@/components/providers/session-provider";
import { loadWorkbenchSnapshot } from "@/lib/data";
import { useLiveQuery } from "@/lib/data/use-live-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingBlock } from "@/components/ui/loading";

export default function SettingsPage() {
  const { profile, canSeeRegion, isDemo, loading: sessionLoading } = useSession();
  const router = useRouter();
  const [wecom, setWecom] = useState<{ configured: boolean; demo: boolean } | null>(
    null,
  );
  const [pushing, setPushing] = useState(false);

  useEffect(() => {
    if (!sessionLoading && !canSeeRegion) router.replace("/users");
  }, [sessionLoading, canSeeRegion, router]);

  useEffect(() => {
    void fetch("/api/wecom/push")
      .then((r) => r.json())
      .then((j) => setWecom(j))
      .catch(() => setWecom({ configured: false, demo: isDemo }));
  }, [isDemo]);

  const { data, loading } = useLiveQuery(
    async () =>
      profile && canSeeRegion ? loadWorkbenchSnapshot(profile) : null,
    [profile?.id, canSeeRegion],
  );

  const redAlerts = useMemo(() => {
    if (!data?.alerts) return [];
    return data.alerts.filter((a) => !a.resolved && a.level === "red");
  }, [data]);

  if (sessionLoading || !canSeeRegion || loading) return <LoadingBlock />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="section-title text-2xl md:text-3xl">设置</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          企微推送 · 定时任务 · 录音质检规则
        </p>
      </div>

      <section className="panel space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold">企业微信群机器人</h2>
          <Badge
            className={
              wecom?.configured || isDemo
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-900"
            }
          >
            {isDemo
              ? "演示模拟"
              : wecom?.configured
                ? "已配置"
                : "未配置"}
          </Badge>
        </div>
        <p className="text-sm text-[var(--muted)]">
          在服务器环境变量配置{" "}
          <code className="rounded bg-[var(--surface-2)] px-1">
            WECOM_BOT_WEBHOOK_URL
          </code>
          （群机器人 Webhook）。推送未处理红灯预警到群里。
        </p>
        <p className="text-sm">
          当前红灯未处理{" "}
          <span className="font-semibold text-rose-700">{redAlerts.length}</span>{" "}
          条
          {data?.alerts
            ? ` · 全部未处理 ${countOpenAlerts(data.alerts)} 条`
            : ""}
        </p>
        <Button
          disabled={pushing || redAlerts.length === 0}
          onClick={async () => {
            setPushing(true);
            try {
              const lines = redAlerts.slice(0, 20).map(
                (a) =>
                  `【红】${a.alert_type} ${a.member_name}${a.user_name ? "/" + a.user_name : ""}：${a.reason}`,
              );
              const res = await fetch("/api/wecom/push", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  title: "无锡片区红灯预警",
                  period: data?.period,
                  lines,
                  sourceKeys: redAlerts.slice(0, 20).map((a) => a.alert_key),
                }),
              });
              const json = await res.json();
              if (!res.ok || !json.ok) {
                throw new Error(json.reason || json.message || "推送失败");
              }
              toast.success(
                json.demo
                  ? `演示：已模拟推送 ${json.pushed} 条`
                  : `已推送 ${json.pushed} 条到企微`,
              );
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "推送失败");
            } finally {
              setPushing(false);
            }
          }}
        >
          {pushing ? "推送中…" : "推送未处理红灯"}
        </Button>
      </section>

      <section className="panel space-y-2 p-4">
        <h2 className="font-semibold">定时日报推送</h2>
        <p className="text-sm text-[var(--muted)]">
          已提供 Cron 接口{" "}
          <code className="rounded bg-[var(--surface-2)] px-1">
            GET /api/cron/wecom-daily
          </code>
          （默认每天 01:00 UTC，见 <code className="rounded bg-[var(--surface-2)] px-1">vercel.json</code>）。
          需配置{" "}
          <code className="rounded bg-[var(--surface-2)] px-1">CRON_SECRET</code>
          ，请求头{" "}
          <code className="rounded bg-[var(--surface-2)] px-1">
            Authorization: Bearer &lt;CRON_SECRET&gt;
          </code>
          。完整预警明细还需{" "}
          <code className="rounded bg-[var(--surface-2)] px-1">
            SUPABASE_SERVICE_ROLE_KEY
          </code>
          。
        </p>
      </section>

      <section className="panel space-y-2 p-4">
        <h2 className="font-semibold">录音质检规则</h2>
        <p className="text-sm text-[var(--muted)]">
          推进到{" "}
          <strong>{STAGES_REQUIRE_RECORDING.join("、")}</strong>{" "}
          时必须上传录音，否则无法提交。T1/T2/T3 可在「质检」页抽听并标记合格/需复盘。
        </p>
      </section>

      <section className="panel space-y-2 p-4">
        <h2 className="font-semibold">流失原因</h2>
        <p className="text-sm text-[var(--muted)]">
          用户推进到「流失」时必须选择原因标签；漏斗诊断页可查看原因分布。
        </p>
      </section>
    </div>
  );
}

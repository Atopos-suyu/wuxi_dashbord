import { NextResponse } from "next/server";
import { computeAlerts } from "@/lib/alerts";
import { currentWeekPeriod } from "@/lib/utils";
import {
  formatAlertsWecomMarkdown,
  isWecomConfigured,
  pushWecomMarkdown,
} from "@/lib/wecom";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDemoMode } from "@/lib/mode";
import type {
  AlertResolution,
  CampusUser,
  DailyReview,
  Goal,
  ParentAttitudeLog,
  Profile,
  TeamCapability,
} from "@/lib/types";

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers.get("authorization") || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const query = new URL(req.url).searchParams.get("secret") || "";
  return bearer === secret || query === secret;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  if (isDemoMode()) {
    return NextResponse.json({
      ok: true,
      demo: true,
      message: "演示模式：定时任务可连通；真实推送请在设置页手动触发或关闭 DEMO",
    });
  }

  if (!isWecomConfigured()) {
    return NextResponse.json(
      { ok: false, reason: "未配置 WECOM_BOT_WEBHOOK_URL" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  if (!admin) {
    // 无 service role 时仍推送提醒，避免 cron 空跑无声
    const content = formatAlertsWecomMarkdown({
      title: "无锡片区日报提醒",
      period: currentWeekPeriod(),
      lines: [
        "定时任务已触发，但未配置 SUPABASE_SERVICE_ROLE_KEY，无法汇总预警明细。",
        "请打开工作台「设置」手动推送红灯，或补齐 service role 后重试。",
      ],
    });
    const result = await pushWecomMarkdown(content);
    return NextResponse.json({
      ok: result.ok,
      limited: true,
      reason: result.ok ? undefined : result.reason,
    });
  }

  const [
    profilesRes,
    usersRes,
    capsRes,
    dailyRes,
    goalsRes,
    resRes,
    attRes,
  ] = await Promise.all([
    admin.from("profiles").select("*"),
    admin.from("users").select("*"),
    admin.from("team_capabilities").select("*"),
    admin.from("daily_reviews").select("*"),
    admin.from("goals").select("*"),
    admin.from("alert_resolutions").select("*"),
    admin.from("parent_attitude_logs").select("*"),
  ]);

  const period = currentWeekPeriod();
  const alerts = computeAlerts({
    members: (profilesRes.data ?? []) as Profile[],
    users: (usersRes.data ?? []) as CampusUser[],
    capabilities: (capsRes.data ?? []) as TeamCapability[],
    dailyReviews: (dailyRes.data ?? []) as DailyReview[],
    goals: (goalsRes.data ?? []) as Goal[],
    resolutions: (resRes.data ?? []) as AlertResolution[],
    attitudeLogs: (attRes.data ?? []) as ParentAttitudeLog[],
    period,
  }).filter((a) => !a.resolved && a.level === "red");

  if (!alerts.length) {
    const content = formatAlertsWecomMarkdown({
      title: "无锡片区日报",
      period,
      lines: ["当前无未处理红灯预警 ✅"],
    });
    const result = await pushWecomMarkdown(content);
    return NextResponse.json({ ok: result.ok, pushed: 0, empty: true });
  }

  const lines = alerts.slice(0, 20).map(
    (a) =>
      `【红】${a.alert_type} ${a.member_name}${a.user_name ? "/" + a.user_name : ""}：${a.reason}`,
  );
  const content = formatAlertsWecomMarkdown({
    title: "无锡片区红灯预警（定时）",
    period,
    lines,
  });
  const result = await pushWecomMarkdown(content);
  if (!result.ok) {
    return NextResponse.json(result, { status: 502 });
  }

  for (const a of alerts.slice(0, 20)) {
    await admin.from("outbound_pushes").upsert(
      {
        channel: "wecom",
        source_key: `cron:${period}:${a.alert_key}`,
        payload: content.slice(0, 500),
        pushed_by: null,
      },
      { onConflict: "channel,source_key" },
    );
  }

  return NextResponse.json({ ok: true, pushed: lines.length });
}

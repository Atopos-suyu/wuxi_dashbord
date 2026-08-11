import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/mode";
import {
  formatAlertsWecomMarkdown,
  isWecomConfigured,
  pushWecomMarkdown,
} from "@/lib/wecom";
import { canSeeRegionDashboard } from "@/lib/permissions";
import type { Profile } from "@/lib/types";

export async function GET() {
  return NextResponse.json({
    configured: isWecomConfigured(),
    demo: isDemoMode(),
  });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    lines?: string[];
    title?: string;
    period?: string;
    sourceKeys?: string[];
  };

  if (isDemoMode()) {
    return NextResponse.json({
      ok: true,
      demo: true,
      pushed: body.lines?.length ?? 0,
      message: "演示模式：已模拟推送（未真正调用企微）",
    });
  }

  if (!isWecomConfigured()) {
    return NextResponse.json(
      { ok: false, reason: "未配置 WECOM_BOT_WEBHOOK_URL" },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, reason: "未登录" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  const me = profile as Profile | null;
  if (!me || !canSeeRegionDashboard(me.role)) {
    return NextResponse.json({ ok: false, reason: "无权限" }, { status: 403 });
  }

  const lines = body.lines ?? [];
  if (!lines.length) {
    return NextResponse.json({ ok: false, reason: "无推送内容" }, { status: 400 });
  }

  const content = formatAlertsWecomMarkdown({
    title: body.title || "无锡片区预警",
    lines,
    period: body.period,
  });

  const result = await pushWecomMarkdown(content);
  if (!result.ok) {
    return NextResponse.json(result, { status: 502 });
  }

  const keys = body.sourceKeys ?? [];
  for (const key of keys) {
    await supabase.from("outbound_pushes").upsert(
      {
        channel: "wecom",
        source_key: key,
        payload: content.slice(0, 500),
        pushed_by: me.id,
      },
      { onConflict: "channel,source_key" },
    );
  }

  return NextResponse.json({ ok: true, pushed: lines.length });
}

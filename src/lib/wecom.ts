/** 企业微信群机器人 Markdown 推送 */

export function isWecomConfigured() {
  return Boolean(process.env.WECOM_BOT_WEBHOOK_URL?.trim());
}

export async function pushWecomMarkdown(content: string) {
  const url = process.env.WECOM_BOT_WEBHOOK_URL?.trim();
  if (!url) {
    return { ok: false as const, skipped: true as const, reason: "未配置 WECOM_BOT_WEBHOOK_URL" };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      msgtype: "markdown",
      markdown: { content: content.slice(0, 4000) },
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    return { ok: false as const, skipped: false as const, reason: text || res.statusText };
  }
  try {
    const json = JSON.parse(text) as { errcode?: number; errmsg?: string };
    if (json.errcode && json.errcode !== 0) {
      return { ok: false as const, skipped: false as const, reason: json.errmsg || text };
    }
  } catch {
    // webhook 有时返回空 body
  }
  return { ok: true as const, skipped: false as const };
}

export function formatAlertsWecomMarkdown(input: {
  title: string;
  lines: string[];
  period?: string;
}) {
  const head = `**${input.title}**${input.period ? `（${input.period}）` : ""}`;
  const body = input.lines.map((l) => `> ${l}`).join("\n");
  return `${head}\n${body}\n\n请打开无锡片区工作台跟进。`;
}

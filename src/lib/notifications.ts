import type { ComputedAlert, AppNotification, Profile } from "@/lib/types";
import { canSeeRegionDashboard } from "@/lib/permissions";

/** 将未处理红/黄预警同步为站内通知（按 source_key 去重） */
export function buildNotificationsFromAlerts(input: {
  recipients: Profile[];
  alerts: ComputedAlert[];
  existing: AppNotification[];
}): AppNotification[] {
  const open = input.alerts.filter((a) => !a.resolved);
  const leaders = input.recipients.filter((p) =>
    canSeeRegionDashboard(p.role),
  );
  const now = new Date().toISOString();
  const next: AppNotification[] = [...input.existing];
  const keys = new Set(next.map((n) => `${n.recipient_id}:${n.source_key}`));

  for (const leader of leaders) {
    for (const a of open) {
      const source_key = a.alert_key;
      const dedupe = `${leader.id}:${source_key}`;
      if (keys.has(dedupe)) continue;
      keys.add(dedupe);
      next.unshift({
        id: `notif-${leader.id}-${source_key}`.slice(0, 120),
        recipient_id: leader.id,
        title: `${a.level === "red" ? "红灯" : "黄灯"} · ${a.alert_type}`,
        body: `${a.member_name}${a.user_name ? ` / ${a.user_name}` : ""}：${a.reason}`,
        link: a.user_id
          ? `/users/${a.user_id}`
          : a.member_id
            ? `/members/${a.member_id}`
            : "/alerts",
        level: a.level,
        source_key,
        read_at: null,
        created_at: now,
      });
    }
  }
  return next;
}

export function unreadCount(rows: AppNotification[], recipientId: string) {
  return rows.filter((n) => n.recipient_id === recipientId && !n.read_at)
    .length;
}

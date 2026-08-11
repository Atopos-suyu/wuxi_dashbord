import {
  ALERT_THRESHOLDS,
  CAPABILITY_KEYS,
  GOAL_METRICS,
  type TrafficLight,
} from "@/lib/constants";
import { computeGoalActuals } from "@/lib/metrics";
import type {
  CampusUser,
  ComputedAlert,
  DailyReview,
  Goal,
  ParentAttitudeLog,
  Profile,
  TeamCapability,
  AlertResolution,
} from "@/lib/types";
import { format, subDays, differenceInCalendarDays } from "date-fns";

function daysSince(iso?: string | null) {
  if (!iso) return 999;
  return differenceInCalendarDays(new Date(), new Date(iso));
}

function consecutiveMissedDaily(
  memberId: string,
  reviews: DailyReview[],
  lookback = 7,
) {
  const set = new Set(
    reviews.filter((r) => r.member_id === memberId).map((r) => r.review_date),
  );
  let streak = 0;
  for (let i = 0; i < lookback; i++) {
    const d = format(subDays(new Date(), i), "yyyy-MM-dd");
    if (set.has(d)) break;
    streak += 1;
  }
  return streak;
}

function capabilityDropWeeks(
  memberId: string,
  caps: TeamCapability[],
): number {
  const list = caps
    .filter((c) => c.member_id === memberId)
    .sort((a, b) => a.period.localeCompare(b.period));
  if (list.length < 2) return 0;
  let drops = 0;
  for (let i = list.length - 1; i >= 1; i--) {
    const cur = list[i];
    const prev = list[i - 1];
    const declining = CAPABILITY_KEYS.some(
      (k) => (cur.scores[k] ?? 0) < (prev.scores[k] ?? 0),
    );
    if (declining) drops += 1;
    else break;
  }
  return drops;
}

function worsenedFromSupport(log: ParentAttitudeLog) {
  return (
    log.from_attitude === "支持" &&
    (log.to_attitude === "犹豫" || log.to_attitude === "反对")
  );
}

/** 动态计算预警（不落库），再与已处理记录合并。口径集中于此，页面只展示。 */
export function computeAlerts(input: {
  members: Profile[];
  users: CampusUser[];
  dailyReviews: DailyReview[];
  capabilities: TeamCapability[];
  resolutions: AlertResolution[];
  attitudeLogs?: ParentAttitudeLog[];
  goals?: Goal[];
  period?: string;
}): ComputedAlert[] {
  const resolved = new Set(input.resolutions.map((r) => r.alert_key));
  const alerts: ComputedAlert[] = [];
  const today = format(new Date(), "yyyy-MM-dd");
  const attitudeLogs = input.attitudeLogs ?? [];

  for (const m of input.members) {
    if (m.role === "T3") continue;

    const miss = consecutiveMissedDaily(m.id, input.dailyReviews);
    if (miss >= ALERT_THRESHOLDS.dailyMissRedDays) {
      alerts.push({
        alert_key: `日报漏填:${m.id}:red:${today.slice(0, 7)}`,
        alert_type: "日报漏填",
        level: "red",
        member_id: m.id,
        member_name: m.full_name,
        reason: `连续 ${miss} 天未填日报`,
      });
    } else if (miss >= ALERT_THRESHOLDS.dailyMissYellowDays) {
      alerts.push({
        alert_key: `日报漏填:${m.id}:yellow:${today}`,
        alert_type: "日报漏填",
        level: "yellow",
        member_id: m.id,
        member_name: m.full_name,
        reason: `近 ${miss} 天未填日报`,
      });
    }

    const dropWeeks = capabilityDropWeeks(m.id, input.capabilities);
    if (dropWeeks >= ALERT_THRESHOLDS.capabilityDropWeeks) {
      alerts.push({
        alert_key: `能力下滑:${m.id}:${dropWeeks}`,
        alert_type: "能力下滑",
        level: "yellow",
        member_id: m.id,
        member_name: m.full_name,
        reason: `连续 ${dropWeeks} 周能力维度下滑`,
      });
    }
  }

  for (const u of input.users) {
    const owner = input.members.find((m) => m.id === u.owner_id);
    const memberName = owner?.full_name ?? "未知";
    const stallDays = daysSince(u.last_stage_update_at || u.updated_at);

    if (
      (u.level === "S" || u.level === "A") &&
      stallDays >= ALERT_THRESHOLDS.stallSADays
    ) {
      alerts.push({
        alert_key: `用户停滞:${u.id}:SA`,
        alert_type: "用户停滞",
        level: "red",
        member_id: u.owner_id,
        member_name: memberName,
        user_id: u.id,
        user_name: u.name,
        contact: u.contact,
        reason: `${u.level} 级用户 ${stallDays} 天无阶段更新`,
      });
    } else if (u.level === "B" && stallDays >= ALERT_THRESHOLDS.stallBDays) {
      alerts.push({
        alert_key: `用户停滞:${u.id}:B`,
        alert_type: "用户停滞",
        level: "yellow",
        member_id: u.owner_id,
        member_name: memberName,
        user_id: u.id,
        user_name: u.name,
        contact: u.contact,
        reason: `B 级用户 ${stallDays} 天无阶段更新`,
      });
    }

    if (
      (u.stage === "产品" || u.stage === "关单") &&
      stallDays >= ALERT_THRESHOLDS.closeTimeoutDays
    ) {
      alerts.push({
        alert_key: `关单超时:${u.id}`,
        alert_type: "关单超时",
        level: "red",
        member_id: u.owner_id,
        member_name: memberName,
        user_id: u.id,
        user_name: u.name,
        contact: u.contact,
        reason: `在「${u.stage}」停留 ${stallDays} 天`,
      });
    }

    if (u.next_action_due && u.next_action_due < today && u.stage !== "成交") {
      const overdue = daysSince(u.next_action_due);
      alerts.push({
        alert_key: `待办逾期:${u.id}:${u.next_action_due}`,
        alert_type: "待办逾期",
        level: overdue > ALERT_THRESHOLDS.overdueRedDays ? "red" : "yellow",
        member_id: u.owner_id,
        member_name: memberName,
        user_id: u.id,
        user_name: u.name,
        contact: u.contact,
        reason: `待办逾期 ${overdue} 天：${u.next_action || "未填写"}`,
      });
    }

    const badLog = attitudeLogs.find(
      (l) => l.user_id === u.id && worsenedFromSupport(l),
    );
    if (badLog) {
      alerts.push({
        alert_key: `家长态度恶化:${u.id}:${badLog.to_attitude}`,
        alert_type: "家长态度恶化",
        level: "red",
        member_id: u.owner_id,
        member_name: memberName,
        user_id: u.id,
        user_name: u.name,
        contact: u.contact,
        reason: `家长态度由「${badLog.from_attitude}」变为「${badLog.to_attitude}」`,
      });
    }
  }

  if (input.goals?.length && input.period) {
    const teamGoals = input.goals.filter(
      (g) => g.period === input.period && g.member_id == null,
    );
    const actuals = computeGoalActuals(input.users, { range: "week" });
    for (const metric of GOAL_METRICS) {
      const goal = teamGoals.find((g) => g.metric === metric);
      if (!goal || goal.target_value <= 0) continue;
      const actual = actuals[metric];
      const pct = Math.round((actual / goal.target_value) * 100);
      if (pct < ALERT_THRESHOLDS.goalLagPct) {
        const t3 = input.members.find((m) => m.role === "T3");
        alerts.push({
          alert_key: `目标落后:team:${input.period}:${metric}`,
          alert_type: "目标落后",
          level: pct < ALERT_THRESHOLDS.goalLagPct / 2 ? "red" : "yellow",
          member_id: t3?.id ?? input.members[0]?.id ?? "",
          member_name: "全队",
          reason: `${metric} 达成 ${pct}%（${actual}/${goal.target_value}）低于 ${ALERT_THRESHOLDS.goalLagPct}%`,
        });
      }
    }
  }

  return alerts.map((a) => ({ ...a, resolved: resolved.has(a.alert_key) }));
}

export function memberTrafficLight(input: {
  member: Profile;
  users: CampusUser[];
  dailyReviews: DailyReview[];
  capabilities: TeamCapability[];
  alerts: ComputedAlert[];
}): { light: TrafficLight; reasons: string[] } {
  const { member } = input;
  if (member.status === "inactive") {
    return { light: "red", reasons: ["成员状态：需干预"] };
  }

  const mine = input.alerts.filter(
    (a) => a.member_id === member.id && !a.resolved,
  );
  const reds = mine.filter((a) => a.level === "red");
  const yellows = mine.filter((a) => a.level === "yellow");

  if (reds.length) {
    return { light: "red", reasons: reds.map((a) => a.reason) };
  }
  if (yellows.length || member.status === "pending") {
    const reasons = yellows.map((a) => a.reason);
    if (member.status === "pending") reasons.push("成员状态：待观察");
    return { light: "yellow", reasons };
  }
  return { light: "green", reasons: ["指标正常"] };
}

export function countOpenAlerts(alerts: ComputedAlert[]) {
  return alerts.filter((a) => !a.resolved).length;
}

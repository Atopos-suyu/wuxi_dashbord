/**
 * V2-5 预警闭环走查（动态计算 + 标记已处理）
 * 运行：npx tsx src/lib/alerts.test.ts
 */
import { format, subDays } from "date-fns";
import { computeAlerts, countOpenAlerts, memberTrafficLight } from "@/lib/alerts";
import { DEMO_PROFILES } from "@/lib/demo/seed-data";
import type {
  AlertResolution,
  CampusUser,
  DailyReview,
  ParentAttitudeLog,
  TeamCapability,
} from "@/lib/types";
import { DEFAULT_CAPABILITY_SCORES, DEFAULT_SIX_DIM_SCORE } from "@/lib/constants";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const today = format(new Date(), "yyyy-MM-dd");
const owner = DEMO_PROFILES.find((p) => p.id === "demo-t0-cs1")!;
const memberInactive = DEMO_PROFILES.find((p) => p.id === "demo-t0-cs2")!;

function user(partial: Partial<CampusUser> & { id: string; name: string }): CampusUser {
  return {
    major: "计科",
    contact: "wx-test",
    channel: "官方新生群",
    owner_id: owner.id,
    level: "A",
    stage: "面试",
    six_dim_score: { ...DEFAULT_SIX_DIM_SCORE },
    family_situation: "",
    parent_attitude: "未接触",
    next_action: "",
    next_action_due: null,
    deal_amount: null,
    remark: "",
    area: "计科",
    last_stage_update_at: new Date().toISOString(),
    last_active_at: null,
    school_region: "无锡学院",
    loss_reason: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...partial,
  };
}

const stalledSA = user({
  id: "u-stall-sa",
  name: "停滞A",
  level: "A",
  stage: "关系铺垫",
  last_stage_update_at: subDays(new Date(), 6).toISOString(),
  updated_at: subDays(new Date(), 6).toISOString(),
});

const closeTimeout = user({
  id: "u-close",
  name: "关单超时",
  level: "S",
  stage: "关单",
  last_stage_update_at: subDays(new Date(), 8).toISOString(),
  updated_at: subDays(new Date(), 8).toISOString(),
});

const overdue = user({
  id: "u-overdue",
  name: "待办逾期",
  level: "B",
  stage: "面试",
  next_action: "约家长",
  next_action_due: format(subDays(new Date(), 2), "yyyy-MM-dd"),
  last_stage_update_at: new Date().toISOString(),
});

const attitudeLogs: ParentAttitudeLog[] = [
  {
    id: "pal-1",
    user_id: "u-attitude",
    from_attitude: "支持",
    to_attitude: "反对",
    changed_by: owner.id,
    created_at: new Date().toISOString(),
  },
];

const attitudeUser = user({
  id: "u-attitude",
  name: "态度恶化",
  parent_attitude: "反对",
});

const capabilities: TeamCapability[] = [
  {
    id: "c1",
    member_id: owner.id,
    period: "2026-W30",
    scores: { ...DEFAULT_CAPABILITY_SCORES, 获客邀约: 4, 面试判断: 4 },
    review_note: "",
    created_at: "2026-07-20T00:00:00.000Z",
  },
  {
    id: "c2",
    member_id: owner.id,
    period: "2026-W31",
    scores: { ...DEFAULT_CAPABILITY_SCORES, 获客邀约: 3, 面试判断: 3 },
    review_note: "",
    created_at: "2026-07-27T00:00:00.000Z",
  },
  {
    id: "c3",
    member_id: owner.id,
    period: "2026-W32",
    scores: { ...DEFAULT_CAPABILITY_SCORES, 获客邀约: 2, 面试判断: 2 },
    review_note: "",
    created_at: "2026-08-03T00:00:00.000Z",
  },
];

// 故意不填近 3 天日报 → 日报漏填红灯
const dailyReviews: DailyReview[] = [
  {
    id: "dr1",
    member_id: owner.id,
    review_date: format(subDays(new Date(), 4), "yyyy-MM-dd"),
    new_contacts: 1,
    new_a: 0,
    private_chats: 0,
    stage_followups: 0,
    group_active: 0,
    highlights: "",
    problems: "",
    next_plan: "",
    support_needed: "",
    created_at: new Date().toISOString(),
  },
];

const users = [stalledSA, closeTimeout, overdue, attitudeUser];
const members = DEMO_PROFILES.filter((p) =>
  ["demo-t0-cs1", "demo-t0-cs2", "demo-t3"].includes(p.id),
);

let alerts = computeAlerts({
  members,
  users,
  dailyReviews,
  capabilities,
  resolutions: [],
  attitudeLogs,
});

assert(
  alerts.some((a) => a.alert_type === "用户停滞" && a.user_id === "u-stall-sa" && a.level === "red"),
  "S/A 停滞应触发红灯",
);
assert(
  alerts.some((a) => a.alert_type === "关单超时" && a.user_id === "u-close"),
  "关单超时应触发",
);
assert(
  alerts.some((a) => a.alert_type === "待办逾期" && a.user_id === "u-overdue"),
  "待办逾期应触发",
);
assert(
  alerts.some((a) => a.alert_type === "家长态度恶化" && a.user_id === "u-attitude"),
  "家长态度恶化应触发",
);
assert(
  alerts.some((a) => a.alert_type === "日报漏填" && a.member_id === owner.id && a.level === "red"),
  "连续≥3天漏填应红灯",
);
assert(
  alerts.some((a) => a.alert_type === "能力下滑" && a.member_id === owner.id),
  "连续2周能力下滑应触发",
);

const openBefore = countOpenAlerts(alerts);
assert(openBefore >= 6, `未处理预警应≥6，实际 ${openBefore}`);

// —— 闭环：标记已处理后同 key 不再算未处理 ——
const target = alerts.find((a) => a.alert_type === "关单超时")!;
const resolutions: AlertResolution[] = [
  {
    id: "ar1",
    alert_key: target.alert_key,
    member_id: target.member_id,
    user_id: target.user_id ?? null,
    alert_type: target.alert_type,
    level: target.level,
    note: "已电话跟进",
    handled_by: "demo-t3",
    created_at: new Date().toISOString(),
  },
];

alerts = computeAlerts({
  members,
  users,
  dailyReviews,
  capabilities,
  resolutions,
  attitudeLogs,
});

const closed = alerts.find((a) => a.alert_key === target.alert_key);
assert(closed?.resolved === true, "标记处理后 resolved=true");
assert(
  countOpenAlerts(alerts) === openBefore - 1,
  "处理后未处理数应减 1",
);

// —— 红绿灯：inactive 成员直接红 ——
const light = memberTrafficLight({
  member: memberInactive,
  users: [],
  dailyReviews: [],
  capabilities: [],
  alerts: [],
});
assert(light.light === "red", "inactive 成员应为红灯");

assert(today.length === 10, "日期格式");

console.log("alerts.test.ts passed");

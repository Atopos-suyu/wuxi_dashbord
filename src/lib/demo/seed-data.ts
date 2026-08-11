import {
  DEFAULT_CAPABILITY_SCORES,
  DEFAULT_SIX_DIM_SCORE,
  type CapabilityScores,
  type SixDimScore,
} from "@/lib/constants";
import type {
  AlertResolution,
  CampusUser,
  DailyReview,
  Goal,
  Profile,
  TeamCapability,
  UserStageLog,
  WeeklyReview,
} from "@/lib/types";
import { calcLevel } from "@/lib/level";
import { currentWeekPeriod, weekStartISO } from "@/lib/utils";
import { format, subDays } from "date-fns";

const thisWeek = currentWeekPeriod();

/** V2 组织树：T3 → T2(片区) → T1 → T0 */
export const DEMO_PROFILES: Profile[] = [
  {
    id: "demo-t3",
    full_name: "陈总负责",
    role: "T3",
    school_region: "无锡学院",
    status: "active",
    area: null,
    manager_id: null,
    created_at: "2026-07-01T08:00:00.000Z",
  },
  {
    id: "demo-t2-cs",
    full_name: "赵计科",
    role: "T2",
    school_region: "无锡学院",
    status: "active",
    area: "计科",
    manager_id: "demo-t3",
    created_at: "2026-07-02T08:00:00.000Z",
  },
  {
    id: "demo-t2-se",
    full_name: "钱软工",
    role: "T2",
    school_region: "无锡学院",
    status: "active",
    area: "软工",
    manager_id: "demo-t3",
    created_at: "2026-07-02T09:00:00.000Z",
  },
  {
    id: "demo-t1-cs",
    full_name: "孙组长",
    role: "T1",
    school_region: "无锡学院",
    status: "active",
    area: "计科",
    manager_id: "demo-t2-cs",
    created_at: "2026-07-05T08:00:00.000Z",
  },
  {
    id: "demo-t1-se",
    full_name: "李组长",
    role: "T1",
    school_region: "无锡学院",
    status: "pending",
    area: "软工",
    manager_id: "demo-t2-se",
    created_at: "2026-07-05T09:00:00.000Z",
  },
  {
    id: "demo-t0-cs1",
    full_name: "周执行",
    role: "T0",
    school_region: "无锡学院",
    status: "active",
    area: "计科",
    manager_id: "demo-t1-cs",
    created_at: "2026-07-08T08:00:00.000Z",
  },
  {
    id: "demo-t0-cs2",
    full_name: "吴执行",
    role: "T0",
    school_region: "无锡学院",
    status: "inactive",
    area: "计科",
    manager_id: "demo-t1-cs",
    created_at: "2026-07-08T09:00:00.000Z",
  },
  {
    id: "demo-t0-se1",
    full_name: "郑执行",
    role: "T0",
    school_region: "无锡学院",
    status: "active",
    area: "软工",
    manager_id: "demo-t1-se",
    created_at: "2026-07-09T08:00:00.000Z",
  },
];

function score(partial: Partial<SixDimScore>): SixDimScore {
  return { ...DEFAULT_SIX_DIM_SCORE, ...partial };
}

function makeUser(
  partial: Omit<CampusUser, "level" | "created_at" | "updated_at" | "six_dim_score"> & {
    six_dim_score?: Partial<SixDimScore>;
    created_at?: string;
    last_stage_update_at?: string;
  },
): CampusUser {
  const six = score(partial.six_dim_score ?? {});
  const created = partial.created_at ?? "2026-08-01T10:00:00.000Z";
  return {
    ...partial,
    six_dim_score: six,
    level: calcLevel(six),
    created_at: created,
    updated_at: created,
    last_stage_update_at: partial.last_stage_update_at ?? created,
  };
}

export const DEMO_USERS: CampusUser[] = [
  makeUser({
    id: "u1",
    name: "小周",
    major: "计科",
    contact: "wx_zhou",
    channel: "官方新生群",
    owner_id: "demo-t0-cs1",
    area: "计科",
    stage: "职规",
    six_dim_score: {
      提前学习意识: 3,
      额外学习意识: 3,
      "学习AI/编程意识": 3,
      付费学习意识: 3,
      付费能力: 3,
      信任度: 2,
    },
    family_situation: "父母稳定",
    parent_attitude: "犹豫",
    next_action: "完成本周职规",
    next_action_due: format(subDays(new Date(), 2), "yyyy-MM-dd"),
    deal_amount: null,
    remark: "S级重点",
    last_stage_update_at: format(subDays(new Date(), 6), "yyyy-MM-dd") + "T10:00:00.000Z",
  }),
  makeUser({
    id: "u2",
    name: "阿杰",
    major: "计科",
    contact: "qq_ajie",
    channel: "抖音",
    owner_id: "demo-t0-cs1",
    area: "计科",
    stage: "面试",
    six_dim_score: {
      提前学习意识: 3,
      额外学习意识: 2,
      "学习AI/编程意识": 3,
      付费学习意识: 2,
      付费能力: 2,
      信任度: 3,
    },
    family_situation: "",
    parent_attitude: "未接触",
    next_action: "约明天面试",
    next_action_due: format(new Date(), "yyyy-MM-dd"),
    deal_amount: null,
    remark: "",
  }),
  makeUser({
    id: "u3",
    name: "小雨",
    major: "软工",
    contact: "wx_rain",
    channel: "转介绍",
    owner_id: "demo-t0-se1",
    area: "软工",
    stage: "产品",
    six_dim_score: {
      提前学习意识: 3,
      额外学习意识: 3,
      "学习AI/编程意识": 3,
      付费学习意识: 3,
      付费能力: 3,
      信任度: 3,
    },
    family_situation: "妈妈主导",
    parent_attitude: "支持",
    next_action: "约关单",
    next_action_due: format(subDays(new Date(), -2), "yyyy-MM-dd"),
    deal_amount: null,
    remark: "S级",
    last_stage_update_at: format(subDays(new Date(), 8), "yyyy-MM-dd") + "T10:00:00.000Z",
  }),
  makeUser({
    id: "u4",
    name: "老陈",
    major: "软工",
    contact: "wx_chen",
    channel: "老乡群",
    owner_id: "demo-t0-se1",
    area: "软工",
    stage: "建联",
    six_dim_score: {
      提前学习意识: 1,
      额外学习意识: 1,
      "学习AI/编程意识": 2,
      付费学习意识: 1,
      付费能力: 2,
      信任度: 2,
    },
    family_situation: "",
    parent_attitude: "未接触",
    next_action: "继续破冰",
    next_action_due: null,
    deal_amount: null,
    remark: "",
  }),
  makeUser({
    id: "u5",
    name: "小凯",
    major: "计科",
    contact: "wx_kai",
    channel: "班助",
    owner_id: "demo-t0-cs2",
    area: "计科",
    stage: "成交",
    six_dim_score: {
      提前学习意识: 3,
      额外学习意识: 3,
      "学习AI/编程意识": 2,
      付费学习意识: 3,
      付费能力: 3,
      信任度: 3,
    },
    family_situation: "已成交",
    parent_attitude: "支持",
    next_action: "售后进群",
    next_action_due: null,
    deal_amount: 6980,
    remark: "本周成交",
    created_at: "2026-08-04T09:00:00.000Z",
  }),
  makeUser({
    id: "u6",
    name: "豆豆",
    major: "计科",
    contact: "wx_dou",
    channel: "小红书",
    owner_id: "demo-t0-cs2",
    area: "计科",
    stage: "关单",
    six_dim_score: {
      提前学习意识: 2,
      额外学习意识: 2,
      "学习AI/编程意识": 3,
      付费学习意识: 2,
      付费能力: 1,
      信任度: 3,
    },
    family_situation: "经济一般",
    parent_attitude: "反对",
    next_action: "再沟通家长",
    next_action_due: format(subDays(new Date(), 4), "yyyy-MM-dd"),
    deal_amount: null,
    remark: "",
    last_stage_update_at: format(subDays(new Date(), 9), "yyyy-MM-dd") + "T10:00:00.000Z",
  }),
];

export const DEMO_STAGE_LOGS: UserStageLog[] = [
  {
    id: "l1",
    user_id: "u1",
    stage: "面试",
    status: "done",
    note: "六维评分完成",
    record_url: "demo://recordings/demo-t0-cs1/u1/interview.m4a",
    owner_id: "demo-t0-cs1",
    created_at: "2026-08-04T14:00:00.000Z",
  },
  {
    id: "l2",
    user_id: "u3",
    stage: "产品",
    status: "done",
    note: "产品讲解",
    record_url: "demo://recordings/demo-t0-se1/u3/product.m4a",
    owner_id: "demo-t0-se1",
    created_at: "2026-08-05T11:00:00.000Z",
  },
  {
    id: "l3",
    user_id: "u5",
    stage: "成交",
    status: "done",
    note: "成交 6980",
    record_url: null,
    owner_id: "demo-t0-cs2",
    created_at: "2026-08-08T12:00:00.000Z",
  },
];

function cap(
  member_id: string,
  period: string,
  scores: Partial<CapabilityScores>,
  note = "",
): TeamCapability {
  return {
    id: `cap-${member_id}-${period}`,
    member_id,
    period,
    scores: { ...DEFAULT_CAPABILITY_SCORES, ...scores },
    review_note: note,
    created_at: "2026-08-01T00:00:00.000Z",
  };
}

export const DEMO_CAPABILITIES: TeamCapability[] = [
  cap("demo-t0-cs1", "2026-W30", { 获客邀约: 3, 关单转化: 2, 复盘数据: 3 }),
  cap("demo-t0-cs1", "2026-W31", { 获客邀约: 4, 关单转化: 3, 复盘数据: 4 }),
  cap(
    "demo-t0-cs1",
    thisWeek,
    { 获客邀约: 4, 面试判断: 4, 关系铺垫: 4, 职规沟通: 3, 产品介绍: 3, 关单转化: 4, 招募带人: 3, 群运营氛围: 4, 复盘数据: 4 },
    "稳定",
  ),
  cap("demo-t0-cs2", "2026-W30", { 获客邀约: 3, 复盘数据: 3 }),
  cap("demo-t0-cs2", "2026-W31", { 获客邀约: 2, 复盘数据: 2 }),
  cap(
    "demo-t0-cs2",
    thisWeek,
    { 获客邀约: 1, 面试判断: 2, 关系铺垫: 2, 职规沟通: 2, 产品介绍: 2, 关单转化: 1, 招募带人: 1, 群运营氛围: 2, 复盘数据: 1 },
    "连续下滑",
  ),
  cap("demo-t0-se1", "2026-W31", { 获客邀约: 3, 关单转化: 3 }),
  cap("demo-t0-se1", thisWeek, { 获客邀约: 3, 关单转化: 3, 复盘数据: 3 }),
];

export const DEMO_DAILY: DailyReview[] = [
  {
    id: "d1",
    member_id: "demo-t0-cs1",
    review_date: format(subDays(new Date(), 1), "yyyy-MM-dd"),
    new_contacts: 5,
    new_a: 1,
    private_chats: 12,
    stage_followups: 4,
    group_active: 4,
    highlights: "推进小周",
    problems: "",
    next_plan: "职规",
    support_needed: "",
    created_at: new Date().toISOString(),
  },
  {
    id: "d2",
    member_id: "demo-t0-se1",
    review_date: format(subDays(new Date(), 1), "yyyy-MM-dd"),
    new_contacts: 3,
    new_a: 0,
    private_chats: 6,
    stage_followups: 2,
    group_active: 3,
    highlights: "小雨产品阶段",
    problems: "",
    next_plan: "关单",
    support_needed: "",
    created_at: new Date().toISOString(),
  },
  // 吴执行故意不填日报 → 触发红灯
];

export const DEMO_WEEKLY: WeeklyReview[] = [
  {
    id: "w1",
    member_id: "demo-t0-cs1",
    week_start: weekStartISO(new Date("2026-08-03")),
    summary: "计科组推进稳定",
    funnel_summary: { 建联: 4, 面试: 2, 职规: 1, 成交: 0 },
    capability_snapshot: DEFAULT_CAPABILITY_SCORES,
    plan_next: "冲刺小周",
    created_at: "2026-08-03T10:00:00.000Z",
  },
];

export const DEMO_GOALS: Goal[] = [
  { id: "g1", member_id: null, period: thisWeek, metric: "招新群", target_value: 180, created_at: "2026-08-01T00:00:00.000Z" },
  { id: "g2", member_id: null, period: thisWeek, metric: "面试", target_value: 90, created_at: "2026-08-01T00:00:00.000Z" },
  { id: "g3", member_id: null, period: thisWeek, metric: "A类", target_value: 40, created_at: "2026-08-01T00:00:00.000Z" },
  { id: "g4", member_id: null, period: thisWeek, metric: "成交", target_value: 6, created_at: "2026-08-01T00:00:00.000Z" },
  { id: "g5", member_id: "demo-t0-cs1", period: thisWeek, metric: "A类", target_value: 12, created_at: "2026-08-01T00:00:00.000Z" },
  { id: "g6", member_id: "demo-t0-se1", period: thisWeek, metric: "A类", target_value: 12, created_at: "2026-08-01T00:00:00.000Z" },
];

export const DEMO_RESOLUTIONS: AlertResolution[] = [];

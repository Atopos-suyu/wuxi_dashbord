import {
  DEFAULT_CAPABILITY_SCORES,
  DEFAULT_SIX_DIM_SCORE,
  type CapabilityScores,
  type SixDimScore,
} from "@/lib/constants";
import type {
  CampusUser,
  DailyReview,
  Profile,
  TeamCapability,
  UserStageLog,
  WeeklyReview,
} from "@/lib/types";
import { calcLevel } from "@/lib/level";
import { currentWeekPeriod, weekStartISO } from "@/lib/utils";

export const DEMO_PROFILES: Profile[] = [
  {
    id: "demo-t0",
    full_name: "陈负责人",
    role: "T0",
    school_region: "无锡学院",
    status: "active",
    created_at: "2026-07-01T08:00:00.000Z",
  },
  {
    id: "demo-t1a",
    full_name: "林组长",
    role: "T1",
    school_region: "无锡学院",
    status: "active",
    created_at: "2026-07-05T08:00:00.000Z",
  },
  {
    id: "demo-t1b",
    full_name: "王成员",
    role: "T1",
    school_region: "无锡学院",
    status: "pending",
    created_at: "2026-07-08T08:00:00.000Z",
  },
];

function score(partial: Partial<SixDimScore>): SixDimScore {
  return { ...DEFAULT_SIX_DIM_SCORE, ...partial };
}

function makeUser(
  partial: Omit<CampusUser, "level" | "created_at" | "updated_at" | "six_dim_score"> & {
    six_dim_score?: Partial<SixDimScore>;
    created_at?: string;
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
  };
}

export const DEMO_USERS: CampusUser[] = [
  makeUser({
    id: "u1",
    name: "小周",
    major: "计科",
    contact: "wx_zhou",
    channel: "官方新生群",
    owner_id: "demo-t1a",
    stage: "职规",
    six_dim_score: {
      提前学习意识: 3,
      额外学习意识: 3,
      "学习AI/编程意识": 3,
      付费学习意识: 3,
      付费能力: 3,
      信任度: 2,
    },
    family_situation: "父母稳定，可沟通",
    parent_attitude: "犹豫",
    next_action: "本周完成职规录音",
    next_action_due: "2026-08-12",
    deal_amount: null,
    remark: "学习意识强，需建立信任",
  }),
  makeUser({
    id: "u2",
    name: "阿杰",
    major: "软工",
    contact: "qq_ajie",
    channel: "抖音",
    owner_id: "demo-t1a",
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
    next_action_due: "2026-08-11",
    deal_amount: null,
    remark: "",
  }),
  makeUser({
    id: "u3",
    name: "小雨",
    major: "AI",
    contact: "wx_rain",
    channel: "转介绍",
    owner_id: "demo-t1b",
    stage: "产品",
    six_dim_score: {
      提前学习意识: 3,
      额外学习意识: 3,
      "学习AI/编程意识": 3,
      付费学习意识: 3,
      付费能力: 3,
      信任度: 3,
    },
    family_situation: "妈妈主导决策",
    parent_attitude: "支持",
    next_action: "产品讲解后约关单",
    next_action_due: "2026-08-13",
    deal_amount: null,
    remark: "S级重点跟进",
  }),
  makeUser({
    id: "u4",
    name: "老陈",
    major: "物联网",
    contact: "wx_chen",
    channel: "老乡群",
    owner_id: "demo-t1b",
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
    major: "大数据",
    contact: "wx_kai",
    channel: "班助",
    owner_id: "demo-t1a",
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
    next_action: "售后跟进进群",
    next_action_due: "2026-08-15",
    deal_amount: 6980,
    remark: "本周成交",
    created_at: "2026-08-04T09:00:00.000Z",
  }),
  makeUser({
    id: "u6",
    name: "豆豆",
    major: "电信",
    contact: "wx_dou",
    channel: "小红书",
    owner_id: "demo-t1b",
    stage: "关系铺垫",
    six_dim_score: {
      提前学习意识: 2,
      额外学习意识: 2,
      "学习AI/编程意识": 3,
      付费学习意识: 2,
      付费能力: 1,
      信任度: 3,
    },
    family_situation: "经济一般",
    parent_attitude: "犹豫",
    next_action: "多聊大学规划",
    next_action_due: "2026-08-14",
    deal_amount: null,
    remark: "",
  }),
];

export const DEMO_STAGE_LOGS: UserStageLog[] = [
  {
    id: "l1",
    user_id: "u1",
    stage: "建联",
    status: "done",
    note: "新生群破冰，加好友",
    record_url: null,
    owner_id: "demo-t1a",
    created_at: "2026-08-02T10:00:00.000Z",
  },
  {
    id: "l2",
    user_id: "u1",
    stage: "面试",
    status: "done",
    note: "六维评分完成，倾向 A+",
    record_url: "demo://recordings/demo-t1a/u1/interview.m4a",
    owner_id: "demo-t1a",
    created_at: "2026-08-04T14:00:00.000Z",
  },
  {
    id: "l3",
    user_id: "u1",
    stage: "关系铺垫",
    status: "done",
    note: "连续三天私聊，信任上升",
    record_url: null,
    owner_id: "demo-t1a",
    created_at: "2026-08-06T20:00:00.000Z",
  },
  {
    id: "l4",
    user_id: "u3",
    stage: "面试",
    status: "done",
    note: "S级判断，学习意愿强",
    record_url: "demo://recordings/demo-t1b/u3/interview.m4a",
    owner_id: "demo-t1b",
    created_at: "2026-08-05T11:00:00.000Z",
  },
  {
    id: "l5",
    user_id: "u5",
    stage: "关单",
    status: "done",
    note: "家长通话顺利",
    record_url: "demo://recordings/demo-t1a/u5/close.m4a",
    owner_id: "demo-t1a",
    created_at: "2026-08-07T16:00:00.000Z",
  },
  {
    id: "l6",
    user_id: "u5",
    stage: "成交",
    status: "done",
    note: "成交 6980",
    record_url: null,
    owner_id: "demo-t1a",
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

const thisWeek = currentWeekPeriod();
export const DEMO_CAPABILITIES: TeamCapability[] = [
  cap("demo-t1a", "2026-W30", { 获客邀约: 3, 面试判断: 3, 关单转化: 2, 复盘数据: 3 }),
  cap("demo-t1a", "2026-W31", { 获客邀约: 4, 面试判断: 3, 关单转化: 3, 复盘数据: 4 }),
  cap(
    "demo-t1a",
    thisWeek,
    { 获客邀约: 4, 面试判断: 4, 关系铺垫: 4, 职规沟通: 3, 产品介绍: 3, 关单转化: 4, 招募带人: 3, 群运营氛围: 4, 复盘数据: 4 },
    "关单节奏稳定，可带新人",
  ),
  cap("demo-t1b", "2026-W30", { 获客邀约: 3, 面试判断: 2, 关单转化: 2, 复盘数据: 2 }),
  cap("demo-t1b", "2026-W31", { 获客邀约: 3, 面试判断: 3, 关单转化: 2, 复盘数据: 2 }),
  cap(
    "demo-t1b",
    thisWeek,
    { 获客邀约: 3, 面试判断: 3, 关系铺垫: 3, 职规沟通: 2, 产品介绍: 2, 关单转化: 2, 招募带人: 2, 群运营氛围: 3, 复盘数据: 2 },
    "复盘质量下滑，需跟进",
  ),
];

export const DEMO_DAILY: DailyReview[] = [
  {
    id: "d1",
    member_id: "demo-t1a",
    review_date: "2026-08-09",
    new_contacts: 5,
    new_a: 1,
    private_chats: 12,
    stage_followups: 4,
    group_active: 4,
    highlights: "推进小凯成交",
    problems: "职规时段冲突",
    next_plan: "跟进小周职规",
    support_needed: "",
    created_at: "2026-08-09T21:00:00.000Z",
  },
  {
    id: "d2",
    member_id: "demo-t1b",
    review_date: "2026-08-08",
    new_contacts: 3,
    new_a: 0,
    private_chats: 6,
    stage_followups: 2,
    group_active: 3,
    highlights: "小雨进入产品阶段",
    problems: "日报漏填",
    next_plan: "补齐跟进",
    support_needed: "希望旁听关单录音",
    created_at: "2026-08-08T21:00:00.000Z",
  },
];

export const DEMO_WEEKLY: WeeklyReview[] = [
  {
    id: "w1",
    member_id: "demo-t1a",
    week_start: weekStartISO(new Date("2026-08-03")),
    summary: "本周完成 1 单成交，面试量稳定",
    funnel_summary: {
      建联: 8,
      面试: 4,
      关系铺垫: 3,
      职规: 2,
      产品: 1,
      关单: 1,
      成交: 1,
    },
    capability_snapshot: DEMO_CAPABILITIES.find(
      (c) => c.member_id === "demo-t1a" && c.period === thisWeek,
    )?.scores ?? DEFAULT_CAPABILITY_SCORES,
    plan_next: "冲刺小周/阿杰转化",
    created_at: "2026-08-03T10:00:00.000Z",
  },
];

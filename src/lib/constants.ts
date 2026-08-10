export const APP_NAME = "无锡片区业务工作台";
export const APP_SHORT_NAME = "WXU 工作台";
export const DEFAULT_SCHOOL_REGION = "无锡学院";

export const ROLES = ["T0", "T1", "T2", "伪T0"] as const;
export type Role = (typeof ROLES)[number];

export const MEMBER_STATUSES = ["active", "pending", "inactive"] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export const MEMBER_STATUS_LABEL: Record<MemberStatus, string> = {
  active: "状态好",
  pending: "待观察",
  inactive: "需干预",
};

export const STAGES = [
  "建联",
  "面试",
  "关系铺垫",
  "职规",
  "产品",
  "关单",
  "成交",
  "流失",
] as const;
export type Stage = (typeof STAGES)[number];

export const FUNNEL_STAGES = STAGES.filter(
  (s) => s !== "流失",
) as readonly Stage[];

export const LEVELS = ["S", "A", "B", "C"] as const;
export type Level = (typeof LEVELS)[number];

export const SIX_DIM_KEYS = [
  "提前学习意识",
  "额外学习意识",
  "学习AI/编程意识",
  "付费学习意识",
  "付费能力",
  "信任度",
] as const;
export type SixDimKey = (typeof SIX_DIM_KEYS)[number];

export type SixDimScore = Record<SixDimKey, number>;

export const DEFAULT_SIX_DIM_SCORE: SixDimScore = {
  提前学习意识: 2,
  额外学习意识: 2,
  "学习AI/编程意识": 2,
  付费学习意识: 2,
  付费能力: 2,
  信任度: 2,
};

export const CAPABILITY_KEYS = [
  "获客邀约",
  "面试判断",
  "关系铺垫",
  "职规沟通",
  "产品介绍",
  "关单转化",
  "招募带人",
  "群运营氛围",
  "复盘数据",
] as const;
export type CapabilityKey = (typeof CAPABILITY_KEYS)[number];

export type CapabilityScores = Record<CapabilityKey, number>;

export const DEFAULT_CAPABILITY_SCORES: CapabilityScores = {
  获客邀约: 3,
  面试判断: 3,
  关系铺垫: 3,
  职规沟通: 3,
  产品介绍: 3,
  关单转化: 3,
  招募带人: 3,
  群运营氛围: 3,
  复盘数据: 3,
};

export const MAJORS = [
  "计科",
  "软工",
  "物联网",
  "大数据",
  "AI",
  "电信",
  "网工",
  "其他",
] as const;

export const CHANNELS = [
  "官方新生群",
  "老乡群",
  "抖音",
  "小红书",
  "班助",
  "转介绍",
  "计协",
  "其他",
] as const;

export const PARENT_ATTITUDES = [
  "支持",
  "犹豫",
  "反对",
  "未接触",
] as const;

export const STAGE_LOG_STATUSES = ["doing", "done", "failed"] as const;
export type StageLogStatus = (typeof STAGE_LOG_STATUSES)[number];

export const STAGE_LOG_STATUS_LABEL: Record<StageLogStatus, string> = {
  doing: "进行中",
  done: "完成",
  failed: "失败",
};

export const LEVEL_COLORS: Record<Level, string> = {
  S: "#C45C26",
  A: "#0B6E4F",
  B: "#1F6B8A",
  C: "#6B7280",
};

export const STAGE_COLORS: Record<Stage, string> = {
  建联: "#64748B",
  面试: "#0EA5A4",
  关系铺垫: "#0284C7",
  职规: "#2563EB",
  产品: "#7C3AED",
  关单: "#D97706",
  成交: "#059669",
  流失: "#9CA3AF",
};

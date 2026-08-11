export const APP_NAME = "无锡片区业务工作台";
export const APP_SHORT_NAME = "WXU 工作台";

/** 双校区 */
export const SCHOOL_REGIONS = ["无锡学院", "无锡太湖学院"] as const;
export type SchoolRegion = (typeof SCHOOL_REGIONS)[number];
export const DEFAULT_SCHOOL_REGION: SchoolRegion = "无锡学院";

/** V2 角色：T3 片区总负责 > T2 专业片区 > T1 组长 > T0 执行 */
export const ROLES = ["T3", "T2", "T1", "T0", "伪T0"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  T3: "片区总负责",
  T2: "专业片区负责人",
  T1: "组长",
  T0: "执行成员",
  伪T0: "预备成员",
};

export const AREAS = ["计科", "软工", "物联网", "大数据", "AI"] as const;
export type Area = (typeof AREAS)[number];

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

/** 推进到这些阶段时必须上传录音（质检） */
export const STAGES_REQUIRE_RECORDING: Stage[] = ["职规", "关单"];

export const QA_STATUSES = ["pending", "passed", "rejected"] as const;
export type QaStatus = (typeof QA_STATUSES)[number];

export const QA_STATUS_LABEL: Record<QaStatus, string> = {
  pending: "待抽听",
  passed: "合格",
  rejected: "需复盘",
};

/** 流失原因标签 */
export const LOSS_REASONS = [
  "价格敏感",
  "家长反对",
  "竞品截流",
  "时间冲突",
  "意向不足",
  "失联",
  "其他",
] as const;
export type LossReason = (typeof LOSS_REASONS)[number];

export const GOAL_METRICS = ["招新群", "面试", "A类", "成交"] as const;
export type GoalMetric = (typeof GOAL_METRICS)[number];

export const ALERT_TYPES = [
  "日报漏填",
  "用户停滞",
  "关单超时",
  "家长态度恶化",
  "待办逾期",
  "能力下滑",
  "目标落后",
] as const;
export type AlertType = (typeof ALERT_TYPES)[number];

/** 预警阈值（可调参） */
export const ALERT_THRESHOLDS = {
  dailyMissYellowDays: 1,
  dailyMissRedDays: 3,
  stallSADays: 5,
  stallBDays: 7,
  closeTimeoutDays: 7,
  overdueYellowDays: 1,
  overdueRedDays: 3,
  capabilityDropWeeks: 2,
  /** 周目标达成率低于该比例触发「目标落后」 */
  goalLagPct: 50,
  /** 成交学员：超过该天数无活跃记为「需召回」 */
  studentInactiveDays: 14,
  /** 9 月活跃目标：至少保持活跃的成交学员数 */
  studentActiveTarget: 5,
} as const;

export const ACTIVITY_TYPES = [
  "社群互动",
  "课时出勤",
  "作业提交",
  "1v1跟进",
  "其他",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export type TrafficLight = "green" | "yellow" | "red";

export const TRAFFIC_LABEL: Record<TrafficLight, string> = {
  green: "正常",
  yellow: "待观察",
  red: "需干预",
};

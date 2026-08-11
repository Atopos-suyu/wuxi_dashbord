import type {
  CapabilityScores,
  GoalMetric,
  Level,
  MemberStatus,
  Role,
  SixDimScore,
  Stage,
  StageLogStatus,
  TrafficLight,
  AlertType,
} from "./constants";
import { PARENT_ATTITUDES } from "./constants";

export type {
  CapabilityScores,
  GoalMetric,
  Level,
  MemberStatus,
  Role,
  SixDimScore,
  Stage,
  StageLogStatus,
  TrafficLight,
  AlertType,
};

export type ParentAttitude = (typeof PARENT_ATTITUDES)[number];

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  school_region: string;
  status: MemberStatus;
  area?: string | null;
  manager_id?: string | null;
  created_at: string;
}

export interface CampusUser {
  id: string;
  name: string;
  major: string;
  contact: string;
  channel: string;
  owner_id: string;
  level: Level;
  stage: Stage;
  six_dim_score: SixDimScore;
  family_situation: string;
  parent_attitude: ParentAttitude | string;
  next_action: string;
  next_action_due: string | null;
  deal_amount: number | null;
  remark: string;
  area?: string | null;
  last_stage_update_at?: string | null;
  created_at: string;
  updated_at: string;
  owner?: Profile | null;
}

export interface UserStageLog {
  id: string;
  user_id: string;
  stage: Stage;
  status: StageLogStatus;
  note: string;
  record_url: string | null;
  owner_id: string;
  created_at: string;
  owner?: Profile | null;
  user?: Pick<CampusUser, "id" | "name" | "contact"> | null;
}

export interface TeamCapability {
  id: string;
  member_id: string;
  period: string;
  scores: CapabilityScores;
  review_note: string;
  created_at: string;
  member?: Profile | null;
}

export interface DailyReview {
  id: string;
  member_id: string;
  review_date: string;
  new_contacts: number;
  new_a: number;
  private_chats: number;
  stage_followups: number;
  group_active: number;
  highlights: string;
  problems: string;
  next_plan: string;
  support_needed: string;
  created_at: string;
  member?: Profile | null;
}

export interface WeeklyReview {
  id: string;
  member_id: string;
  week_start: string;
  summary: string;
  funnel_summary: Record<string, number>;
  capability_snapshot: CapabilityScores | null;
  plan_next: string;
  created_at: string;
  member?: Profile | null;
}

export interface Goal {
  id: string;
  member_id: string | null;
  period: string;
  metric: GoalMetric;
  target_value: number;
  created_at: string;
}

export interface AlertResolution {
  id: string;
  alert_key: string;
  member_id: string;
  user_id: string | null;
  alert_type: AlertType | string;
  level: "red" | "yellow";
  note: string;
  handled_by: string;
  created_at: string;
}

export interface ComputedAlert {
  alert_key: string;
  alert_type: AlertType;
  level: "red" | "yellow";
  member_id: string;
  member_name: string;
  user_id?: string | null;
  user_name?: string | null;
  contact?: string | null;
  reason: string;
  resolved?: boolean;
}

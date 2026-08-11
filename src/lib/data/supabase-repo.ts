"use client";

import { createClient } from "@/lib/supabase/client";
import { normalizeSixDim } from "@/lib/level";
import type {
  CampusUser,
  DailyReview,
  Profile,
  TeamCapability,
  UserStageLog,
  WeeklyReview,
} from "@/lib/types";
import type { CapabilityScores, SixDimScore, Stage } from "@/lib/constants";

function sb() {
  return createClient();
}

function mapUser(row: Record<string, unknown>): CampusUser {
  const owner = row.owner as Profile | null | undefined;
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    major: String(row.major ?? ""),
    contact: String(row.contact ?? ""),
    channel: String(row.channel ?? ""),
    owner_id: String(row.owner_id),
    level: row.level as CampusUser["level"],
    stage: row.stage as Stage,
    six_dim_score: (row.six_dim_score ?? {}) as SixDimScore,
    family_situation: String(row.family_situation ?? ""),
    parent_attitude: String(row.parent_attitude ?? "未接触"),
    next_action: String(row.next_action ?? ""),
    next_action_due: (row.next_action_due as string | null) ?? null,
    deal_amount:
      row.deal_amount === null || row.deal_amount === undefined
        ? null
        : Number(row.deal_amount),
    remark: String(row.remark ?? ""),
    area: (row.area as string | null) ?? null,
    last_stage_update_at: (row.last_stage_update_at as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    owner: owner ?? null,
  };
}

export async function sbListProfiles(): Promise<Profile[]> {
  const { data, error } = await sb()
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function sbListUsersFor(_profile: Profile): Promise<CampusUser[]> {
  // 可见范围由 RLS can_see_member(owner_id) 控制
  const { data, error } = await sb()
    .from("users")
    .select("*, owner:profiles!owner_id(*)")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapUser(row as Record<string, unknown>));
}

export async function sbGetUser(id: string): Promise<CampusUser | null> {
  const { data, error } = await sb()
    .from("users")
    .select("*, owner:profiles!owner_id(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapUser(data as Record<string, unknown>) : null;
}

export async function sbUpsertUser(
  input: Partial<CampusUser> & Pick<CampusUser, "name" | "owner_id">,
  opts?: { changedBy?: string | null },
): Promise<CampusUser | null> {
  const payload: Record<string, unknown> = {
    name: input.name,
    owner_id: input.owner_id,
  };
  const fields: (keyof CampusUser)[] = [
    "major",
    "contact",
    "channel",
    "stage",
    "family_situation",
    "parent_attitude",
    "next_action",
    "next_action_due",
    "deal_amount",
    "remark",
    "area",
  ];
  for (const key of fields) {
    if (input[key] !== undefined) payload[key] = input[key];
  }
  if (input.six_dim_score) {
    payload.six_dim_score = normalizeSixDim(input.six_dim_score);
  }

  if (input.id) {
    if (input.parent_attitude !== undefined) {
      const { data: prev } = await sb()
        .from("users")
        .select("parent_attitude")
        .eq("id", input.id)
        .maybeSingle();
      if (prev && prev.parent_attitude !== input.parent_attitude) {
        await sb().from("parent_attitude_logs").insert({
          user_id: input.id,
          from_attitude: prev.parent_attitude,
          to_attitude: input.parent_attitude,
          changed_by: opts?.changedBy ?? null,
        });
      }
    }
    const { data, error } = await sb()
      .from("users")
      .update(payload)
      .eq("id", input.id)
      .select("*, owner:profiles!owner_id(*)")
      .single();
    if (error) throw error;
    return mapUser(data as Record<string, unknown>);
  }

  const { data, error } = await sb()
    .from("users")
    .insert(payload)
    .select("*, owner:profiles!owner_id(*)")
    .single();
  if (error) throw error;
  return mapUser(data as Record<string, unknown>);
}

export async function sbCompleteUserTodo(userId: string) {
  const { data, error } = await sb()
    .from("users")
    .update({ next_action: "", next_action_due: null })
    .eq("id", userId)
    .select("*, owner:profiles!owner_id(*)")
    .single();
  if (error) throw error;
  return mapUser(data as Record<string, unknown>);
}

export async function sbListStageLogs(
  userId?: string,
  _profile?: Profile,
): Promise<UserStageLog[]> {
  // 可见范围由 RLS can_see_member(owner_id) 控制
  let query = sb()
    .from("user_stage_logs")
    .select("*, owner:profiles!owner_id(*), user:users(id, name, contact)")
    .order("created_at", { ascending: false });
  if (userId) query = query.eq("user_id", userId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const user = r.user as { id: string; name: string; contact?: string } | null;
    return {
      id: String(r.id),
      user_id: String(r.user_id),
      stage: r.stage as Stage,
      status: r.status as UserStageLog["status"],
      note: String(r.note ?? ""),
      record_url: (r.record_url as string | null) ?? null,
      owner_id: String(r.owner_id),
      created_at: String(r.created_at),
      owner: (r.owner as Profile | null) ?? null,
      user: user
        ? { id: user.id, name: user.name, contact: user.contact ?? "" }
        : null,
    };
  });
}

export async function sbAddStageLog(
  input: Omit<UserStageLog, "id" | "created_at"> & { advanceUser?: boolean },
): Promise<UserStageLog> {
  const { advanceUser, ...rest } = input;
  const { data, error } = await sb()
    .from("user_stage_logs")
    .insert(rest)
    .select("*")
    .single();
  if (error) throw error;
  if (advanceUser) {
    await sb()
      .from("users")
      .update({ stage: rest.stage })
      .eq("id", rest.user_id);
  }
  return data as UserStageLog;
}

export async function sbListRecordings(profile: Profile): Promise<UserStageLog[]> {
  const logs = await sbListStageLogs(undefined, profile);
  const withAudio = logs.filter((l) => !!l.record_url);
  return Promise.all(
    withAudio.map(async (log) => ({
      ...log,
      record_url: await resolveRecordingUrl(log.record_url),
    })),
  );
}

async function resolveRecordingUrl(url: string | null): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith("http") || url.startsWith("blob:")) return url;
  const path = url.replace(/^recordings\//, "");
  const { data, error } = await sb()
    .storage.from("recordings")
    .createSignedUrl(path, 60 * 60 * 24 * 7);
  if (error) return url;
  return data.signedUrl;
}

export async function sbUploadRecording(
  file: File,
  ownerId: string,
  userId: string,
): Promise<string> {
  const ext = (file.name.split(".").pop() || "m4a").toLowerCase();
  const path = `${ownerId}/${userId}/${Date.now()}.${ext}`;
  const { error } = await sb().storage.from("recordings").upload(path, file, {
    contentType: file.type || "audio/mp4",
    upsert: false,
  });
  if (error) throw error;
  // 存相对路径，播放时再签名
  return path;
}

export async function sbListCapabilities(memberId?: string): Promise<TeamCapability[]> {
  let query = sb()
    .from("team_capabilities")
    .select("*, member:profiles!member_id(*)")
    .order("period", { ascending: true });
  if (memberId) query = query.eq("member_id", memberId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: String(r.id),
      member_id: String(r.member_id),
      period: String(r.period),
      scores: r.scores as CapabilityScores,
      review_note: String(r.review_note ?? ""),
      created_at: String(r.created_at),
      member: (r.member as Profile | null) ?? null,
    };
  });
}

export async function sbUpsertCapability(
  input: Omit<TeamCapability, "id" | "created_at"> & { id?: string },
): Promise<void> {
  const { error } = await sb().from("team_capabilities").upsert(
    {
      member_id: input.member_id,
      period: input.period,
      scores: input.scores,
      review_note: input.review_note,
    },
    { onConflict: "member_id,period" },
  );
  if (error) throw error;
}

export async function sbUpdateProfile(
  id: string,
  patch: Partial<Profile>,
): Promise<void> {
  const { error } = await sb().from("profiles").update(patch).eq("id", id);
  if (error) throw error;
}

export async function sbListDaily(
  opts?: { memberId?: string; reviewDate?: string },
): Promise<DailyReview[]> {
  let query = sb()
    .from("daily_reviews")
    .select("*, member:profiles!member_id(*)")
    .order("review_date", { ascending: false });
  if (opts?.memberId) query = query.eq("member_id", opts.memberId);
  if (opts?.reviewDate) query = query.eq("review_date", opts.reviewDate);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as DailyReview[];
}

export async function sbUpsertDaily(
  input: Omit<DailyReview, "id" | "created_at"> & { id?: string },
): Promise<void> {
  const { error } = await sb().from("daily_reviews").upsert(
    {
      member_id: input.member_id,
      review_date: input.review_date,
      new_contacts: input.new_contacts,
      new_a: input.new_a,
      private_chats: input.private_chats,
      stage_followups: input.stage_followups,
      group_active: input.group_active,
      highlights: input.highlights,
      problems: input.problems,
      next_plan: input.next_plan,
      support_needed: input.support_needed,
    },
    { onConflict: "member_id,review_date" },
  );
  if (error) throw error;
}

export async function sbListWeekly(memberId?: string): Promise<WeeklyReview[]> {
  let query = sb()
    .from("weekly_reviews")
    .select("*, member:profiles!member_id(*)")
    .order("week_start", { ascending: false });
  if (memberId) query = query.eq("member_id", memberId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as WeeklyReview[];
}

export async function sbUpsertWeekly(
  input: Omit<WeeklyReview, "id" | "created_at"> & { id?: string },
): Promise<void> {
  const { error } = await sb().from("weekly_reviews").upsert(
    {
      member_id: input.member_id,
      week_start: input.week_start,
      summary: input.summary,
      funnel_summary: input.funnel_summary,
      capability_snapshot: input.capability_snapshot,
      plan_next: input.plan_next,
    },
    { onConflict: "member_id,week_start" },
  );
  if (error) throw error;
}

export async function sbListGoals(period?: string) {
  let query = sb().from("goals").select("*").order("created_at", { ascending: true });
  if (period) query = query.eq("period", period);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as import("@/lib/types").Goal[];
}

export async function sbUpsertGoal(
  input: Omit<import("@/lib/types").Goal, "id" | "created_at"> & { id?: string },
) {
  if (input.id) {
    const { error } = await sb().from("goals").update({
      member_id: input.member_id,
      period: input.period,
      metric: input.metric,
      target_value: input.target_value,
    }).eq("id", input.id);
    if (error) throw error;
    return;
  }
  const { error } = await sb().from("goals").insert({
    member_id: input.member_id,
    period: input.period,
    metric: input.metric,
    target_value: input.target_value,
  });
  if (error) throw error;
}

export async function sbListResolutions() {
  const { data, error } = await sb()
    .from("alert_resolutions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as import("@/lib/types").AlertResolution[];
}

export async function sbResolveAlert(
  input: Omit<import("@/lib/types").AlertResolution, "id" | "created_at">,
) {
  const { error } = await sb().from("alert_resolutions").upsert(
    {
      alert_key: input.alert_key,
      member_id: input.member_id,
      user_id: input.user_id,
      alert_type: input.alert_type,
      level: input.level,
      note: input.note,
      handled_by: input.handled_by,
    },
    { onConflict: "alert_key" },
  );
  if (error) throw error;
}

export async function sbListAttitudeLogs(userId?: string) {
  let query = sb()
    .from("parent_attitude_logs")
    .select("*")
    .order("created_at", { ascending: false });
  if (userId) query = query.eq("user_id", userId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as import("@/lib/types").ParentAttitudeLog[];
}

export async function sbCopyGoalsFromPeriod(
  fromPeriod: string,
  toPeriod: string,
) {
  const { data: source, error } = await sb()
    .from("goals")
    .select("*")
    .eq("period", fromPeriod);
  if (error) throw error;
  let copied = 0;
  for (const g of source ?? []) {
    let existsQuery = sb()
      .from("goals")
      .select("id")
      .eq("period", toPeriod)
      .eq("metric", g.metric);
    existsQuery =
      g.member_id == null
        ? existsQuery.is("member_id", null)
        : existsQuery.eq("member_id", g.member_id);
    const { data: existing } = await existsQuery.maybeSingle();
    if (existing) continue;
    const { error: insertError } = await sb().from("goals").insert({
      member_id: g.member_id,
      period: toPeriod,
      metric: g.metric,
      target_value: g.target_value,
    });
    if (!insertError) copied += 1;
  }
  return copied;
}

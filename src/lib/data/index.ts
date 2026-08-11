"use client";

import { isDemoMode } from "@/lib/mode";
import {
  addStageLog as demoAddStageLog,
  getUser as demoGetUser,
  listGoals as demoListGoals,
  listAttitudeLogs as demoListAttitudeLogs,
  listRecordings as demoListRecordings,
  listResolutions as demoListResolutions,
  listStageLogs as demoListStageLogs,
  listQaQueue as demoListQaQueue,
  reviewStageLog as demoReviewStageLog,
  listUsersFor as demoListUsersFor,
  loadDemoDB,
  resolveAlert as demoResolveAlert,
  completeUserTodo as demoCompleteUserTodo,
  copyGoalsFromPeriod as demoCopyGoals,
  listNotifications as demoListNotifications,
  upsertNotifications as demoUpsertNotifications,
  markNotificationRead as demoMarkNotificationRead,
  markAllNotificationsRead as demoMarkAllNotificationsRead,
  listActivities as demoListActivities,
  addStudentActivity as demoAddStudentActivity,
  updateProfile as demoUpdateProfile,
  upsertCapability as demoUpsertCapability,
  upsertDaily as demoUpsertDaily,
  upsertGoal as demoUpsertGoal,
  upsertUser as demoUpsertUser,
  upsertWeekly as demoUpsertWeekly,
} from "@/lib/demo/store";
import { computeAlerts } from "@/lib/alerts";
import { buildNotificationsFromAlerts } from "@/lib/notifications";
import { canSeeRegionDashboard } from "@/lib/permissions";
import type {
  AlertResolution,
  AppNotification,
  CampusUser,
  DailyReview,
  Goal,
  ParentAttitudeLog,
  Profile,
  StudentActivity,
  TeamCapability,
  UserStageLog,
  WeeklyReview,
} from "@/lib/types";
import * as sb from "@/lib/data/supabase-repo";
import { currentWeekPeriod } from "@/lib/utils";

export async function listProfiles(): Promise<Profile[]> {
  if (isDemoMode()) return loadDemoDB().profiles;
  return sb.sbListProfiles();
}

export async function listUsersFor(profile: Profile): Promise<CampusUser[]> {
  if (isDemoMode()) return demoListUsersFor(profile);
  return sb.sbListUsersFor(profile);
}

export async function getUser(id: string): Promise<CampusUser | null> {
  if (isDemoMode()) return demoGetUser(id);
  return sb.sbGetUser(id);
}

export async function upsertUser(
  input: Partial<CampusUser> & Pick<CampusUser, "name" | "owner_id">,
  opts?: { changedBy?: string | null },
): Promise<CampusUser | null> {
  if (isDemoMode()) return demoUpsertUser(input, opts);
  return sb.sbUpsertUser(input, opts);
}

export async function completeUserTodo(userId: string): Promise<CampusUser | null> {
  if (isDemoMode()) return demoCompleteUserTodo(userId);
  return sb.sbCompleteUserTodo(userId);
}

export async function listStageLogs(
  userId?: string,
  profile?: Profile,
): Promise<UserStageLog[]> {
  if (isDemoMode()) return demoListStageLogs(userId, profile);
  return sb.sbListStageLogs(userId, profile);
}

export async function addStageLog(
  input: Omit<UserStageLog, "id" | "created_at"> & { advanceUser?: boolean },
): Promise<UserStageLog> {
  if (isDemoMode()) return demoAddStageLog(input);
  return sb.sbAddStageLog(input);
}

export async function listQaQueue(profile: Profile): Promise<UserStageLog[]> {
  if (isDemoMode()) return demoListQaQueue(profile);
  return sb.sbListQaQueue(profile);
}

export async function reviewStageLog(
  id: string,
  input: {
    qa_status: "passed" | "rejected";
    qa_note?: string;
    qa_by: string;
  },
): Promise<UserStageLog | null> {
  if (isDemoMode()) return demoReviewStageLog(id, input);
  return sb.sbReviewStageLog(id, input);
}

export async function listRecordings(profile: Profile): Promise<UserStageLog[]> {
  if (isDemoMode()) return demoListRecordings(profile);
  return sb.sbListRecordings(profile);
}

export async function uploadRecording(
  file: File,
  ownerId: string,
  userId: string,
): Promise<string> {
  if (isDemoMode()) return URL.createObjectURL(file);
  return sb.sbUploadRecording(file, ownerId, userId);
}

export async function listCapabilities(memberId?: string): Promise<TeamCapability[]> {
  if (isDemoMode()) {
    const caps = loadDemoDB().capabilities;
    return memberId ? caps.filter((c) => c.member_id === memberId) : caps;
  }
  return sb.sbListCapabilities(memberId);
}

export async function upsertCapability(
  input: Omit<TeamCapability, "id" | "created_at"> & { id?: string },
): Promise<void> {
  if (isDemoMode()) {
    demoUpsertCapability(input);
    return;
  }
  await sb.sbUpsertCapability(input);
}

export async function updateProfile(
  id: string,
  patch: Partial<Profile>,
): Promise<void> {
  if (isDemoMode()) {
    demoUpdateProfile(id, patch);
    return;
  }
  await sb.sbUpdateProfile(id, patch);
}

export async function listDailyReviews(opts?: {
  memberId?: string;
  reviewDate?: string;
}): Promise<DailyReview[]> {
  if (isDemoMode()) {
    let rows = loadDemoDB().dailyReviews;
    if (opts?.memberId) rows = rows.filter((r) => r.member_id === opts.memberId);
    if (opts?.reviewDate)
      rows = rows.filter((r) => r.review_date === opts.reviewDate);
    return rows;
  }
  return sb.sbListDaily(opts);
}

export async function upsertDaily(
  input: Omit<DailyReview, "id" | "created_at"> & { id?: string },
): Promise<void> {
  if (isDemoMode()) {
    demoUpsertDaily(input);
    return;
  }
  await sb.sbUpsertDaily(input);
}

export async function listWeeklyReviews(memberId?: string): Promise<WeeklyReview[]> {
  if (isDemoMode()) {
    const rows = loadDemoDB().weeklyReviews;
    return memberId ? rows.filter((r) => r.member_id === memberId) : rows;
  }
  return sb.sbListWeekly(memberId);
}

export async function upsertWeekly(
  input: Omit<WeeklyReview, "id" | "created_at"> & { id?: string },
): Promise<void> {
  if (isDemoMode()) {
    demoUpsertWeekly(input);
    return;
  }
  await sb.sbUpsertWeekly(input);
}

export async function listGoals(period?: string): Promise<Goal[]> {
  if (isDemoMode()) return demoListGoals(period);
  return sb.sbListGoals(period);
}

export async function upsertGoal(
  input: Omit<Goal, "id" | "created_at"> & { id?: string },
): Promise<void> {
  if (isDemoMode()) {
    demoUpsertGoal(input);
    return;
  }
  await sb.sbUpsertGoal(input);
}

export async function listResolutions(): Promise<AlertResolution[]> {
  if (isDemoMode()) return demoListResolutions();
  return sb.sbListResolutions();
}

export async function resolveAlert(
  input: Omit<AlertResolution, "id" | "created_at">,
): Promise<void> {
  if (isDemoMode()) {
    demoResolveAlert(input);
    return;
  }
  await sb.sbResolveAlert(input);
}

export async function listAttitudeLogs(
  userId?: string,
): Promise<ParentAttitudeLog[]> {
  if (isDemoMode()) return demoListAttitudeLogs(userId);
  return sb.sbListAttitudeLogs(userId);
}

export async function copyGoalsFromPeriod(
  fromPeriod: string,
  toPeriod: string,
): Promise<number> {
  if (isDemoMode()) return demoCopyGoals(fromPeriod, toPeriod);
  return sb.sbCopyGoalsFromPeriod(fromPeriod, toPeriod);
}

export async function listNotifications(
  recipientId: string,
): Promise<AppNotification[]> {
  if (isDemoMode()) return demoListNotifications(recipientId);
  return sb.sbListNotifications(recipientId);
}

export async function markNotificationRead(id: string): Promise<void> {
  if (isDemoMode()) {
    demoMarkNotificationRead(id);
    return;
  }
  await sb.sbMarkNotificationRead(id);
}

export async function markAllNotificationsRead(
  recipientId: string,
): Promise<void> {
  if (isDemoMode()) {
    demoMarkAllNotificationsRead(recipientId);
    return;
  }
  await sb.sbMarkAllNotificationsRead(recipientId);
}

export async function listActivities(
  userId?: string,
): Promise<StudentActivity[]> {
  if (isDemoMode()) return demoListActivities(userId);
  return sb.sbListActivities(userId);
}

export async function addStudentActivity(
  input: Omit<StudentActivity, "id" | "created_at">,
): Promise<StudentActivity> {
  if (isDemoMode()) return demoAddStudentActivity(input);
  return sb.sbAddStudentActivity(input);
}

/** 聚合快照：看板/成员页用；并同步站内通知 */
export async function loadWorkbenchSnapshot(profile: Profile) {
  const leader = canSeeRegionDashboard(profile.role) || profile.role === "T1";
  const [
    profiles,
    users,
    capabilities,
    dailyReviews,
    weeklyReviews,
    goals,
    resolutions,
    attitudeLogs,
    activities,
    existingNotifications,
  ] = await Promise.all([
    listProfiles(),
    listUsersFor(profile),
    listCapabilities(),
    listDailyReviews(leader ? undefined : { memberId: profile.id }),
    listWeeklyReviews(leader ? undefined : profile.id),
    listGoals(),
    listResolutions(),
    listAttitudeLogs(),
    listActivities(),
    listNotifications(profile.id),
  ]);

  const period = currentWeekPeriod();
  const alerts = computeAlerts({
    members: profiles,
    users,
    dailyReviews,
    capabilities,
    resolutions,
    attitudeLogs,
    goals,
    period,
  });

  if (canSeeRegionDashboard(profile.role)) {
    const built = buildNotificationsFromAlerts({
      recipients: [profile],
      alerts,
      existing: existingNotifications,
    });
    const fresh = built.filter(
      (n) =>
        !existingNotifications.some(
          (e) => e.source_key === n.source_key && e.recipient_id === n.recipient_id,
        ),
    );
    if (fresh.length) {
      if (isDemoMode()) {
        demoUpsertNotifications(fresh);
      } else {
        await sb.sbUpsertNotifications(
          fresh.map((n) => ({
            ...n,
            id: undefined as unknown as string,
          })),
        );
      }
    }
  }

  const notifications = await listNotifications(profile.id);

  return {
    profiles,
    users,
    capabilities,
    dailyReviews,
    weeklyReviews,
    goals,
    resolutions,
    attitudeLogs,
    activities,
    notifications,
    alerts,
    period,
  };
}

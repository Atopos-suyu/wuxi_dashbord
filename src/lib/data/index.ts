"use client";

import { isDemoMode } from "@/lib/mode";
import {
  addStageLog as demoAddStageLog,
  getUser as demoGetUser,
  listRecordings as demoListRecordings,
  listStageLogs as demoListStageLogs,
  listUsersFor as demoListUsersFor,
  loadDemoDB,
  updateProfile as demoUpdateProfile,
  upsertCapability as demoUpsertCapability,
  upsertDaily as demoUpsertDaily,
  upsertUser as demoUpsertUser,
  upsertWeekly as demoUpsertWeekly,
} from "@/lib/demo/store";
import type {
  CampusUser,
  DailyReview,
  Profile,
  TeamCapability,
  UserStageLog,
  WeeklyReview,
} from "@/lib/types";
import * as sb from "@/lib/data/supabase-repo";

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
): Promise<CampusUser | null> {
  if (isDemoMode()) return demoUpsertUser(input);
  return sb.sbUpsertUser(input);
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

/** 聚合快照：看板/成员页用 */
export async function loadWorkbenchSnapshot(profile: Profile) {
  const [profiles, users, capabilities, dailyReviews, weeklyReviews] =
    await Promise.all([
      listProfiles(),
      listUsersFor(profile),
      listCapabilities(),
      listDailyReviews(
        profile.role === "T0" ? undefined : { memberId: profile.id },
      ),
      listWeeklyReviews(profile.role === "T0" ? undefined : profile.id),
    ]);
  return { profiles, users, capabilities, dailyReviews, weeklyReviews };
}

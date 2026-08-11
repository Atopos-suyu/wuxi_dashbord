"use client";

import {
  DEMO_CAPABILITIES,
  DEMO_DAILY,
  DEMO_GOALS,
  DEMO_PROFILES,
  DEMO_RESOLUTIONS,
  DEMO_STAGE_LOGS,
  DEMO_USERS,
  DEMO_WEEKLY,
} from "@/lib/demo/seed-data";
import { calcLevel, normalizeSixDim } from "@/lib/level";
import { visibleMemberIds } from "@/lib/permissions";
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
import { uid } from "@/lib/utils";

const STORAGE_KEY = "wxu_demo_db_v2";

export interface DemoDB {
  profiles: Profile[];
  users: CampusUser[];
  stageLogs: UserStageLog[];
  capabilities: TeamCapability[];
  dailyReviews: DailyReview[];
  weeklyReviews: WeeklyReview[];
  goals: Goal[];
  resolutions: AlertResolution[];
}

function seed(): DemoDB {
  return {
    profiles: structuredClone(DEMO_PROFILES),
    users: structuredClone(DEMO_USERS),
    stageLogs: structuredClone(DEMO_STAGE_LOGS),
    capabilities: structuredClone(DEMO_CAPABILITIES),
    dailyReviews: structuredClone(DEMO_DAILY),
    weeklyReviews: structuredClone(DEMO_WEEKLY),
    goals: structuredClone(DEMO_GOALS),
    resolutions: structuredClone(DEMO_RESOLUTIONS),
  };
}

export function loadDemoDB(): DemoDB {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const db = seed();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
      return db;
    }
    const parsed = JSON.parse(raw) as DemoDB;
    if (!parsed.goals) parsed.goals = structuredClone(DEMO_GOALS);
    if (!parsed.resolutions) parsed.resolutions = [];
    return parsed;
  } catch {
    return seed();
  }
}

export function saveDemoDB(db: DemoDB) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  window.dispatchEvent(new CustomEvent("wxu-demo-updated"));
}

export function resetDemoDB() {
  const db = seed();
  saveDemoDB(db);
  return db;
}

export function getDemoSession(): Profile | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith("wxu_demo_user="));
  if (!match) return null;
  const id = decodeURIComponent(match.split("=")[1] ?? "");
  return loadDemoDB().profiles.find((p) => p.id === id) ?? null;
}

export function setDemoSession(profileId: string) {
  document.cookie = `wxu_demo_user=${encodeURIComponent(profileId)}; path=/; max-age=${60 * 60 * 24 * 30}`;
}

export function clearDemoSession() {
  document.cookie = "wxu_demo_user=; path=/; max-age=0";
}

export function listUsersFor(profile: Profile) {
  const db = loadDemoDB();
  const ids = visibleMemberIds(profile, db.profiles);
  const users = db.users.filter((u) => ids.has(u.owner_id));
  return users
    .map((u) => ({
      ...u,
      owner: db.profiles.find((p) => p.id === u.owner_id) ?? null,
    }))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function getUser(id: string) {
  const db = loadDemoDB();
  const user = db.users.find((u) => u.id === id);
  if (!user) return null;
  return {
    ...user,
    owner: db.profiles.find((p) => p.id === user.owner_id) ?? null,
  };
}

export function upsertUser(
  input: Partial<CampusUser> & Pick<CampusUser, "name" | "owner_id">,
) {
  const db = loadDemoDB();
  const now = new Date().toISOString();
  const owner = db.profiles.find((p) => p.id === input.owner_id);
  if (input.id) {
    db.users = db.users.map((u) => {
      if (u.id !== input.id) return u;
      const six = normalizeSixDim(input.six_dim_score ?? u.six_dim_score);
      const stageChanged = input.stage && input.stage !== u.stage;
      return {
        ...u,
        ...input,
        area: input.area ?? u.area ?? owner?.area ?? null,
        six_dim_score: six,
        level: calcLevel(six),
        updated_at: now,
        last_stage_update_at: stageChanged
          ? now
          : (input.last_stage_update_at ?? u.last_stage_update_at),
      };
    });
  } else {
    const six = normalizeSixDim(input.six_dim_score);
    db.users.unshift({
      id: uid("user"),
      name: input.name,
      major: input.major ?? "",
      contact: input.contact ?? "",
      channel: input.channel ?? "",
      owner_id: input.owner_id,
      area: input.area ?? owner?.area ?? null,
      stage: input.stage ?? "建联",
      six_dim_score: six,
      level: calcLevel(six),
      family_situation: input.family_situation ?? "",
      parent_attitude: input.parent_attitude ?? "未接触",
      next_action: input.next_action ?? "",
      next_action_due: input.next_action_due ?? null,
      deal_amount: input.deal_amount ?? null,
      remark: input.remark ?? "",
      created_at: now,
      updated_at: now,
      last_stage_update_at: now,
    });
  }
  saveDemoDB(db);
  return getUser(input.id ?? db.users[0].id);
}

export function addStageLog(
  input: Omit<UserStageLog, "id" | "created_at"> & { advanceUser?: boolean },
) {
  const db = loadDemoDB();
  const log: UserStageLog = {
    ...input,
    id: uid("log"),
    created_at: new Date().toISOString(),
  };
  db.stageLogs.unshift(log);
  if (input.advanceUser) {
    db.users = db.users.map((u) =>
      u.id === input.user_id
        ? {
            ...u,
            stage: input.stage,
            updated_at: log.created_at,
            last_stage_update_at: log.created_at,
          }
        : u,
    );
  }
  saveDemoDB(db);
  return log;
}

export function listStageLogs(userId?: string, profile?: Profile) {
  const db = loadDemoDB();
  let logs = db.stageLogs;
  if (userId) logs = logs.filter((l) => l.user_id === userId);
  if (profile) {
    const ids = visibleMemberIds(profile, db.profiles);
    logs = logs.filter((l) => ids.has(l.owner_id));
  }
  return logs
    .map((l) => {
      const user = db.users.find((u) => u.id === l.user_id);
      return {
        ...l,
        owner: db.profiles.find((p) => p.id === l.owner_id) ?? null,
        user: user
          ? { id: user.id, name: user.name, contact: user.contact }
          : null,
      };
    })
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function listRecordings(profile: Profile) {
  return listStageLogs(undefined, profile).filter((l) => !!l.record_url);
}

export function upsertCapability(
  input: Omit<TeamCapability, "id" | "created_at"> & { id?: string },
) {
  const db = loadDemoDB();
  const existing = db.capabilities.find(
    (c) => c.member_id === input.member_id && c.period === input.period,
  );
  if (existing) {
    db.capabilities = db.capabilities.map((c) =>
      c.id === existing.id
        ? { ...c, scores: input.scores, review_note: input.review_note }
        : c,
    );
  } else {
    db.capabilities.push({
      id: uid("cap"),
      member_id: input.member_id,
      period: input.period,
      scores: input.scores,
      review_note: input.review_note,
      created_at: new Date().toISOString(),
    });
  }
  saveDemoDB(db);
}

export function upsertDaily(
  input: Omit<DailyReview, "id" | "created_at"> & { id?: string },
) {
  const db = loadDemoDB();
  const existing = db.dailyReviews.find(
    (d) =>
      d.member_id === input.member_id && d.review_date === input.review_date,
  );
  if (existing) {
    db.dailyReviews = db.dailyReviews.map((d) =>
      d.id === existing.id ? { ...d, ...input, id: existing.id } : d,
    );
  } else {
    db.dailyReviews.unshift({
      ...input,
      id: uid("daily"),
      created_at: new Date().toISOString(),
    });
  }
  saveDemoDB(db);
}

export function upsertWeekly(
  input: Omit<WeeklyReview, "id" | "created_at"> & { id?: string },
) {
  const db = loadDemoDB();
  const existing = db.weeklyReviews.find(
    (w) => w.member_id === input.member_id && w.week_start === input.week_start,
  );
  if (existing) {
    db.weeklyReviews = db.weeklyReviews.map((w) =>
      w.id === existing.id ? { ...w, ...input, id: existing.id } : w,
    );
  } else {
    db.weeklyReviews.unshift({
      ...input,
      id: uid("weekly"),
      created_at: new Date().toISOString(),
    });
  }
  saveDemoDB(db);
}

export function updateProfile(id: string, patch: Partial<Profile>) {
  const db = loadDemoDB();
  db.profiles = db.profiles.map((p) => (p.id === id ? { ...p, ...patch } : p));
  saveDemoDB(db);
}

export function createDemoProfile(input: {
  full_name: string;
  role: Profile["role"];
  area?: string | null;
  manager_id?: string | null;
}): Profile {
  const db = loadDemoDB();
  const profile: Profile = {
    id: uid("profile"),
    full_name: input.full_name,
    role: input.role,
    school_region: "无锡学院",
    status: "active",
    area: input.area ?? null,
    manager_id: input.manager_id ?? null,
    created_at: new Date().toISOString(),
  };
  db.profiles.push(profile);
  saveDemoDB(db);
  return profile;
}

export function listGoals(period?: string) {
  const db = loadDemoDB();
  return period
    ? db.goals.filter((g) => g.period === period)
    : db.goals;
}

export function upsertGoal(
  input: Omit<Goal, "id" | "created_at"> & { id?: string },
) {
  const db = loadDemoDB();
  const existing = db.goals.find(
    (g) =>
      g.period === input.period &&
      g.metric === input.metric &&
      (g.member_id ?? null) === (input.member_id ?? null),
  );
  if (existing || input.id) {
    const id = input.id ?? existing!.id;
    db.goals = db.goals.map((g) =>
      g.id === id ? { ...g, ...input, id } : g,
    );
  } else {
    db.goals.push({
      ...input,
      id: uid("goal"),
      created_at: new Date().toISOString(),
    });
  }
  saveDemoDB(db);
}

export function listResolutions() {
  return loadDemoDB().resolutions;
}

export function resolveAlert(
  input: Omit<AlertResolution, "id" | "created_at">,
) {
  const db = loadDemoDB();
  if (db.resolutions.some((r) => r.alert_key === input.alert_key)) return;
  db.resolutions.unshift({
    ...input,
    id: uid("res"),
    created_at: new Date().toISOString(),
  });
  saveDemoDB(db);
}

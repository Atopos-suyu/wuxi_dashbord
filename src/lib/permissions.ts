import type { Profile, Role, CampusUser } from "@/lib/types";
import type { SchoolRegion } from "@/lib/constants";

/** 片区总览 / 目标 / 预警：T3、T2 */
export function canSeeRegionDashboard(role?: Role | null) {
  return role === "T3" || role === "T2";
}

/** 成员看板 / 能力打分：T3、T2、T1 */
export function canSeeMembersBoard(role?: Role | null) {
  return role === "T3" || role === "T2" || role === "T1";
}

/** 无全局报表：仅 T0 / 伪T0 */
export function isExecutor(role?: Role | null) {
  return role === "T0" || role === "伪T0";
}

/** 组织管理台：仅 T3 */
export function canManageOrg(role?: Role | null) {
  return role === "T3";
}

/** T3 可跨校区；其他角色默认只看本校区 */
export function sameCampus(a?: string | null, b?: string | null) {
  if (!a || !b) return true;
  return a === b;
}

export function canSeeMember(
  viewer: Profile,
  target: Profile,
  all: Profile[],
): boolean {
  if (viewer.role === "T3") return true;
  if (viewer.id === target.id) return true;
  if (!sameCampus(viewer.school_region, target.school_region)) return false;
  if (target.manager_id === viewer.id) return true;
  const mid = all.find((p) => p.id === target.manager_id);
  if (mid && mid.manager_id === viewer.id) return true;
  if (
    viewer.role === "T2" &&
    viewer.area &&
    target.area &&
    viewer.area === target.area
  ) {
    return true;
  }
  return false;
}

export function visibleMembers(viewer: Profile, all: Profile[]) {
  return all.filter((p) => canSeeMember(viewer, p, all));
}

export function visibleMemberIds(viewer: Profile, all: Profile[]) {
  return new Set(visibleMembers(viewer, all).map((p) => p.id));
}

/** 按校区过滤用户（T3 可选全部） */
export function filterUsersByCampus(
  users: CampusUser[],
  campus: SchoolRegion | "all",
  profiles: Profile[],
) {
  if (campus === "all") return users;
  const ownerCampus = new Map(profiles.map((p) => [p.id, p.school_region]));
  return users.filter((u) => {
    if (u.school_region) return u.school_region === campus;
    return ownerCampus.get(u.owner_id) === campus;
  });
}

export function filterProfilesByCampus(
  profiles: Profile[],
  campus: SchoolRegion | "all",
) {
  if (campus === "all") return profiles;
  return profiles.filter((p) => p.school_region === campus);
}

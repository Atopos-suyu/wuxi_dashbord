import type { Profile, Role } from "@/lib/types";

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

export function canSeeMember(
  viewer: Profile,
  target: Profile,
  all: Profile[],
): boolean {
  if (viewer.role === "T3") return true;
  if (viewer.id === target.id) return true;
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

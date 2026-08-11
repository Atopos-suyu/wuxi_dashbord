import type { GoalMetric } from "@/lib/constants";
import type { CampusUser } from "@/lib/types";
import { isWithinRange } from "@/lib/utils";

/** 目标实际值聚合口径（看板/目标页/预警共用） */
export function computeGoalActuals(
  users: CampusUser[],
  opts?: { ownerId?: string | null; range?: "week" | "month" | "all" },
): Record<GoalMetric, number> {
  const scoped = opts?.ownerId
    ? users.filter((u) => u.owner_id === opts.ownerId)
    : users;
  const range = opts?.range ?? "week";
  return {
    招新群: scoped.length,
    面试: scoped.filter((u) =>
      ["面试", "关系铺垫", "职规", "产品", "关单", "成交"].includes(u.stage),
    ).length,
    A类: scoped.filter((u) => u.level === "A" || u.level === "S").length,
    成交: scoped.filter(
      (u) => u.stage === "成交" && isWithinRange(u.updated_at, range),
    ).length,
  };
}

export function previousWeekPeriod(period: string): string | null {
  const m = /^(\d{4})-W(\d{2})$/.exec(period);
  if (!m) return null;
  let year = Number(m[1]);
  let week = Number(m[2]) - 1;
  if (week < 1) {
    year -= 1;
    week = 52;
  }
  return `${year}-W${String(week).padStart(2, "0")}`;
}

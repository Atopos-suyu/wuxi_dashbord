import { FUNNEL_STAGES, type Stage } from "@/lib/constants";
import type { CampusUser } from "@/lib/types";

const ORDER = FUNNEL_STAGES as readonly Stage[];

export function stageIndex(stage: Stage) {
  const i = ORDER.indexOf(stage as (typeof ORDER)[number]);
  return i < 0 ? -1 : i;
}

/** 是否到达或超过某阶段（流失单独处理） */
export function reachedStage(user: CampusUser, stage: Stage) {
  if (user.stage === "流失") return false;
  const ui = stageIndex(user.stage);
  const ti = stageIndex(stage);
  if (ui < 0 || ti < 0) return false;
  return ui >= ti;
}

export function funnelStock(users: CampusUser[]) {
  return ORDER.map((stage) => ({
    stage,
    count: users.filter((u) => u.stage === stage).length,
  }));
}

/** 阶段转化率：到达下一阶段 / 到达本阶段 */
export function funnelConversion(users: CampusUser[]) {
  const rows: {
    from: Stage;
    to: Stage;
    fromCount: number;
    toCount: number;
    rate: number | null;
  }[] = [];
  for (let i = 0; i < ORDER.length - 1; i++) {
    const from = ORDER[i];
    const to = ORDER[i + 1];
    const fromCount = users.filter((u) => reachedStage(u, from)).length;
    const toCount = users.filter((u) => reachedStage(u, to)).length;
    rows.push({
      from,
      to,
      fromCount,
      toCount,
      rate: fromCount > 0 ? Math.round((toCount / fromCount) * 1000) / 10 : null,
    });
  }
  const lostUsers = users.filter((u) => u.stage === "流失");
  const lost = lostUsers.length;
  const lossByReason = new Map<string, number>();
  for (const u of lostUsers) {
    const key = u.loss_reason || "未标注";
    lossByReason.set(key, (lossByReason.get(key) ?? 0) + 1);
  }
  return {
    rows,
    lost,
    lostUsers,
    lossByReason: Array.from(lossByReason.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
    total: users.length,
    dealRate:
      users.length > 0
        ? Math.round(
            (users.filter((u) => u.stage === "成交").length / users.length) *
              1000,
          ) / 10
        : 0,
  };
}

export function groupByKey<T>(items: T[], keyFn: (t: T) => string) {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = keyFn(item) || "未分";
    const list = map.get(k) ?? [];
    list.push(item);
    map.set(k, list);
  }
  return map;
}

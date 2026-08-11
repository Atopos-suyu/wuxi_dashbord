/**
 * V2-5 权限矩阵走查（与 can_see_member / 校区隔离对齐）
 * 运行：npx tsx src/lib/permissions.test.ts
 */
import { DEMO_PROFILES } from "@/lib/demo/seed-data";
import {
  canManageOrg,
  canSeeMember,
  canSeeMembersBoard,
  canSeeRegionDashboard,
  isExecutor,
  visibleMembers,
} from "@/lib/permissions";

function byId(id: string) {
  const p = DEMO_PROFILES.find((x) => x.id === id);
  if (!p) throw new Error(`missing profile ${id}`);
  return p;
}

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const t3 = byId("demo-t3");
const t2cs = byId("demo-t2-cs");
const t2se = byId("demo-t2-se");
const t2th = byId("demo-t2-th");
const t1cs = byId("demo-t1-cs");
const t1se = byId("demo-t1-se");
const t0cs1 = byId("demo-t0-cs1");
const t0cs2 = byId("demo-t0-cs2");
const t0se1 = byId("demo-t0-se1");
const t0th1 = byId("demo-t0-th1");

// —— 角色入口 ——
assert(canSeeRegionDashboard("T3") && canSeeRegionDashboard("T2"), "T3/T2 可见总览");
assert(!canSeeRegionDashboard("T1") && !canSeeRegionDashboard("T0"), "T1/T0 无总览");
assert(canSeeMembersBoard("T1") && !canSeeMembersBoard("T0"), "T1 可见成员板，T0 不可");
assert(isExecutor("T0") && isExecutor("伪T0"), "执行角色");
assert(canManageOrg("T3") && !canManageOrg("T2"), "仅 T3 管组织");

// —— T3 看全部（含跨校区） ——
assert(
  visibleMembers(t3, DEMO_PROFILES).length === DEMO_PROFILES.length,
  "T3 可见全部成员",
);
assert(canSeeMember(t3, t0th1, DEMO_PROFILES), "T3 可见太湖学院成员");

// —— T2 仅本专业片区 + 本校区 ——
assert(canSeeMember(t2cs, t0cs1, DEMO_PROFILES), "计科 T2 可见本片区 T0");
assert(canSeeMember(t2cs, t1cs, DEMO_PROFILES), "计科 T2 可见本片区 T1");
assert(!canSeeMember(t2cs, t0se1, DEMO_PROFILES), "计科 T2 不可见软工 T0");
assert(!canSeeMember(t2cs, t2se, DEMO_PROFILES), "计科 T2 不可见软工 T2");
assert(!canSeeMember(t2cs, t0th1, DEMO_PROFILES), "无锡学院 T2 不可见太湖学院");
assert(canSeeMember(t2th, t0th1, DEMO_PROFILES), "太湖 T2 可见本校区本片区");
assert(!canSeeMember(t2th, t0cs1, DEMO_PROFILES), "太湖 T2 不可见无锡学院");

// —— T1 组内 ——
assert(canSeeMember(t1cs, t0cs1, DEMO_PROFILES), "T1 可见组内 T0");
assert(canSeeMember(t1cs, t0cs2, DEMO_PROFILES), "T1 可见组内另一 T0");
assert(!canSeeMember(t1cs, t0se1, DEMO_PROFILES), "T1 不可见别组 T0");
assert(canSeeMember(t1cs, t1cs, DEMO_PROFILES), "T1 可见自己");
assert(!canSeeMember(t1se, t0cs1, DEMO_PROFILES), "软工 T1 不可见计科 T0");

// —— T0 仅自己 ——
assert(canSeeMember(t0cs1, t0cs1, DEMO_PROFILES), "T0 可见自己");
assert(!canSeeMember(t0cs1, t0cs2, DEMO_PROFILES), "T0 不可见同组同事");
assert(!canSeeMember(t0cs1, t1cs, DEMO_PROFILES), "T0 不可见上级");
assert(visibleMembers(t0cs1, DEMO_PROFILES).length === 1, "T0 可见成员数=1");

console.log("permissions.test.ts passed");

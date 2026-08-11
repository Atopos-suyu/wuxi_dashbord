import { GOAL_METRICS, ROLE_LABEL, TRAFFIC_LABEL } from "@/lib/constants";
import { memberTrafficLight } from "@/lib/alerts";
import { computeGoalActuals } from "@/lib/metrics";
import { studentActivityStats } from "@/lib/students";
import type {
  CampusUser,
  ComputedAlert,
  DailyReview,
  Goal,
  Profile,
  StudentActivity,
  TeamCapability,
} from "@/lib/types";
import { downloadCsv } from "@/lib/utils";

/** 周作战会包：多段 CSV 依次下载 */
export function exportWeeklyBriefing(input: {
  period: string;
  members: Profile[];
  users: CampusUser[];
  dailyReviews: DailyReview[];
  capabilities: TeamCapability[];
  alerts: ComputedAlert[];
  goals: Goal[];
  activities: StudentActivity[];
}) {
  const openAlerts = input.alerts.filter((a) => !a.resolved);
  const actuals = computeGoalActuals(input.users, { range: "week" });
  const teamGoals = input.goals.filter(
    (g) => g.period === input.period && g.member_id == null,
  );
  const studentStats = studentActivityStats(input.users, input.activities);

  downloadCsv(`briefing-${input.period}-traffic.csv`, [
    ["成员", "角色", "片区", "红绿灯", "原因"],
    ...input.members.map((m) => {
      const { light, reasons } = memberTrafficLight({
        member: m,
        users: input.users,
        dailyReviews: input.dailyReviews,
        capabilities: input.capabilities,
        alerts: input.alerts,
      });
      return [
        m.full_name,
        ROLE_LABEL[m.role],
        m.area ?? "",
        TRAFFIC_LABEL[light],
        reasons.join("；"),
      ];
    }),
  ]);

  setTimeout(() => {
    downloadCsv(`briefing-${input.period}-alerts.csv`, [
      ["级别", "类型", "成员", "用户", "原因"],
      ...openAlerts.map((a) => [
        a.level,
        a.alert_type,
        a.member_name,
        a.user_name ?? "",
        a.reason,
      ]),
    ]);
  }, 200);

  setTimeout(() => {
    downloadCsv(`briefing-${input.period}-goals.csv`, [
      ["指标", "实际", "目标", "达成率"],
      ...GOAL_METRICS.map((metric) => {
        const goal = teamGoals.find((g) => g.metric === metric);
        const target = Number(goal?.target_value ?? 0);
        const actual = actuals[metric];
        const pct = target > 0 ? Math.round((actual / target) * 100) : 0;
        return [metric, String(actual), String(target), `${pct}%`];
      }),
    ]);
  }, 400);

  setTimeout(() => {
    downloadCsv(`briefing-${input.period}-students.csv`, [
      ["成交学员", "活跃状态", "未活跃天数", "最近活跃"],
      ...studentStats.deals.map((u) => {
        const active = studentStats.active.some((a) => a.id === u.id);
        const days = Math.max(
          0,
          Math.floor(
            (Date.now() -
              new Date(u.last_active_at || u.updated_at).getTime()) /
              86400000,
          ),
        );
        return [
          u.name,
          active ? "活跃" : "需召回",
          String(days),
          u.last_active_at ?? "",
        ];
      }),
      [],
      ["活跃人数", String(studentStats.activeCount)],
      ["目标", String(studentStats.target)],
    ]);
  }, 600);
}

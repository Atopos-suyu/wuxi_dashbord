import { ALERT_THRESHOLDS } from "@/lib/constants";
import type { CampusUser, StudentActivity } from "@/lib/types";
import { differenceInCalendarDays } from "date-fns";

export function dealStudents(users: CampusUser[]) {
  return users.filter((u) => u.stage === "成交");
}

export function studentInactiveDays(user: CampusUser) {
  const at = user.last_active_at || user.updated_at;
  return differenceInCalendarDays(new Date(), new Date(at));
}

export function isStudentActive(user: CampusUser) {
  return studentInactiveDays(user) <= ALERT_THRESHOLDS.studentInactiveDays;
}

export function studentActivityStats(
  users: CampusUser[],
  activities: StudentActivity[],
) {
  const deals = dealStudents(users);
  const active = deals.filter(isStudentActive);
  const needRecall = deals.filter((u) => !isStudentActive(u));
  const recent = [...activities]
    .sort((a, b) => b.happened_at.localeCompare(a.happened_at))
    .slice(0, 20);
  return {
    deals,
    active,
    needRecall,
    recent,
    activeCount: active.length,
    target: ALERT_THRESHOLDS.studentActiveTarget,
  };
}

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  endOfWeek,
  format,
  getISOWeek,
  getISOWeekYear,
  startOfWeek,
  subDays,
} from "date-fns";
import { zhCN } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value?: string | null, pattern = "MM/dd") {
  if (!value) return "—";
  return format(new Date(value), pattern, { locale: zhCN });
}

export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return format(new Date(value), "MM/dd HH:mm", { locale: zhCN });
}

export function currentWeekPeriod(date = new Date()) {
  const year = getISOWeekYear(date);
  const week = getISOWeek(date);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export function currentMonthPeriod(date = new Date()) {
  return format(date, "yyyy-MM");
}

export function weekStartISO(date = new Date()) {
  return format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

export function weekEndISO(date = new Date()) {
  return format(endOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
}

export function isWithinRange(
  iso: string,
  range: "week" | "month" | "all",
  now = new Date(),
) {
  if (range === "all") return true;
  const d = new Date(iso);
  if (range === "week") {
    return d >= startOfWeek(now, { weekStartsOn: 1 }) && d <= now;
  }
  return d >= new Date(now.getFullYear(), now.getMonth(), 1) && d <= now;
}

export function recentDays(n: number) {
  return Array.from({ length: n }, (_, i) =>
    format(subDays(new Date(), n - 1 - i), "yyyy-MM-dd"),
  );
}

export function downloadCsv(filename: string, rows: string[][]) {
  const content = rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell ?? "");
          if (/[",\n]/.test(value)) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(","),
    )
    .join("\n");
  const blob = new Blob(["\uFEFF" + content], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function uid(prefix = "id") {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

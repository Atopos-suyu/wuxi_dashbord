"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useSession } from "@/components/providers/session-provider";
import {
  listDailyReviews,
  listProfiles,
  upsertDaily,
} from "@/lib/data";
import { useLiveQuery } from "@/lib/data/use-live-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { LoadingBlock } from "@/components/ui/loading";
import { recentDays } from "@/lib/utils";

export default function DailyReviewPage() {
  const { profile, canSeeMembers } = useSession();
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: profiles = [] } = useLiveQuery(() => listProfiles(), []);
  const {
    data: reviews = [],
    loading,
    reload,
  } = useLiveQuery(() => listDailyReviews(), []);

  const mine = reviews.find(
    (d) => d.member_id === profile?.id && d.review_date === today,
  );

  const [form, setForm] = useState({
    new_contacts: 0,
    new_a: 0,
    private_chats: 0,
    stage_followups: 0,
    group_active: 3,
    highlights: "",
    problems: "",
    next_plan: "",
    support_needed: "",
  });

  useEffect(() => {
    if (!mine) return;
    setForm({
      new_contacts: mine.new_contacts,
      new_a: mine.new_a,
      private_chats: mine.private_chats,
      stage_followups: mine.stage_followups,
      group_active: mine.group_active,
      highlights: mine.highlights,
      problems: mine.problems,
      next_plan: mine.next_plan,
      support_needed: mine.support_needed,
    });
  }, [mine?.id])

  const [filterMember, setFilterMember] = useState("all");
  const [filterDate, setFilterDate] = useState(today);

  const members = profiles.filter((p) => p.role !== "T3");
  const weekDays = recentDays(7);

  const missing = useMemo(() => {
    if (!canSeeMembers) return [];
    return members.filter((m) =>
      weekDays
        .slice(-3)
        .every(
          (d) =>
            !reviews.some(
              (r) => r.member_id === m.id && r.review_date === d,
            ),
        ),
    );
  }, [canSeeMembers, members, weekDays, reviews]);

  const list = reviews
    .filter((d) => {
      if (!canSeeMembers) return d.member_id === profile?.id;
      if (filterMember !== "all" && d.member_id !== filterMember) return false;
      if (filterDate && d.review_date !== filterDate) return false;
      return true;
    })
    .sort((a, b) => b.review_date.localeCompare(a.review_date));

  if (loading) return <LoadingBlock />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="section-title text-2xl md:text-3xl">每日复盘</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {mine ? "今日已提交，可修改" : "今天还没填，花 2 分钟对齐数据"}
        </p>
      </div>

      <form
        className="panel space-y-3 p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!profile) return;
          try {
            await upsertDaily({
              member_id: profile.id,
              review_date: today,
              ...form,
            });
            reload();
            toast.success(mine ? "日报已更新" : "日报已提交");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "提交失败");
          }
        }}
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {(
            [
              ["new_contacts", "今日加人"],
              ["new_a", "新增 A 类"],
              ["private_chats", "主动私聊"],
              ["stage_followups", "阶段跟进"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-2">
              <Label>{label}</Label>
              <Input
                type="number"
                min={0}
                value={form[key]}
                onChange={(e) =>
                  setForm({ ...form, [key]: Number(e.target.value) })
                }
              />
            </div>
          ))}
          <div className="space-y-2">
            <Label>群活跃 (1-5)</Label>
            <Input
              type="number"
              min={1}
              max={5}
              value={form.group_active}
              onChange={(e) =>
                setForm({ ...form, group_active: Number(e.target.value) })
              }
            />
          </div>
        </div>
        {(
          [
            ["highlights", "今天做得好"],
            ["problems", "遇到的问题"],
            ["next_plan", "明天计划"],
            ["support_needed", "需要负责人支持"],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="space-y-2">
            <Label>{label}</Label>
            <Textarea
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          </div>
        ))}
        <Button className="w-full" type="submit">
          {mine ? "更新今日复盘" : "提交今日复盘"}
        </Button>
      </form>

      {canSeeMembers ? (
        <>
          {missing.length ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              连续未填日报提醒：{missing.map((m) => m.full_name).join("、")}
            </div>
          ) : null}
          <div className="panel grid grid-cols-2 gap-2 p-3">
            <Select
              value={filterMember}
              onChange={(e) => setFilterMember(e.target.value)}
            >
              <option value="all">全部成员</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </Select>
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>
          <div className="space-y-3">
            {list.map((item) => {
              const member = profiles.find((p) => p.id === item.member_id);
              return (
                <article key={item.id} className="panel p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">
                      {member?.full_name} · {item.review_date}
                    </p>
                    <Badge className="bg-[var(--surface-2)] text-[var(--ink-soft)]">
                      加人 {item.new_contacts} / A {item.new_a}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-[var(--ink-soft)]">
                    私聊 {item.private_chats} · 跟进 {item.stage_followups} ·
                    群活跃 {item.group_active}
                  </p>
                  {item.highlights ? (
                    <p className="mt-2 text-sm">亮点：{item.highlights}</p>
                  ) : null}
                  {item.problems ? (
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      问题：{item.problems}
                    </p>
                  ) : null}
                  {item.support_needed ? (
                    <p className="mt-1 text-sm text-[var(--accent)]">
                      需支持：{item.support_needed}
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}

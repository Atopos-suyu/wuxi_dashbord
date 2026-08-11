"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { LEVELS, STAGES } from "@/lib/constants";
import { useSession } from "@/components/providers/session-provider";
import { listProfiles, listUsersFor } from "@/lib/data";
import { useLiveQuery } from "@/lib/data/use-live-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty";
import { LoadingBlock } from "@/components/ui/loading";
import { LevelBadge } from "@/components/users/level-badge";
import { StageBadge } from "@/components/users/stage-badge";
import { formatDate } from "@/lib/utils";
import type { CampusUser } from "@/lib/types";

export default function UsersPage() {
  const { profile, canSeeMembers, isExecutorOnly } = useSession();
  const { data: users = [], loading } = useLiveQuery(
    async () => (profile ? listUsersFor(profile) : []),
    [profile?.id, profile?.role],
  );
  const { data: profiles = [] } = useLiveQuery(() => listProfiles(), []);
  const members = profiles.filter((p) => p.role === "T0" || p.role === "伪T0" || p.role === "T1");
  const showOwnerFilter = canSeeMembers;

  const [q, setQ] = useState("");
  const [stage, setStage] = useState("all");
  const [level, setLevel] = useState("all");
  const [owner, setOwner] = useState("all");
  const [major, setMajor] = useState("all");

  const majors = useMemo(
    () => Array.from(new Set(users.map((u) => u.major).filter(Boolean))),
    [users],
  );

  const filtered = users.filter((u) => {
    if (stage !== "all" && u.stage !== stage) return false;
    if (level !== "all" && u.level !== level) return false;
    if (owner !== "all" && u.owner_id !== owner) return false;
    if (major !== "all" && u.major !== major) return false;
    if (q) {
      const hay = `${u.name}${u.contact}${u.remark}${u.channel}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  if (loading) return <LoadingBlock />;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="section-title text-2xl md:text-3xl">用户列表</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {isExecutorOnly ? "我负责的用户" : "可见范围内用户"} · {filtered.length} 人
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/users/new">
            <Plus className="h-4 w-4" />
            新增
          </Link>
        </Button>
      </div>

      <div className="panel space-y-3 p-3 md:p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <Input
            className="pl-9"
            placeholder="搜索姓名 / 联系方式 / 备注"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Select value={stage} onChange={(e) => setStage(e.target.value)}>
            <option value="all">全部阶段</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Select value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="all">全部等级</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </Select>
          <Select value={major} onChange={(e) => setMajor(e.target.value)}>
            <option value="all">全部专业</option>
            {majors.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </Select>
          {showOwnerFilter ? (
            <Select value={owner} onChange={(e) => setOwner(e.target.value)}>
              <option value="all">全部负责人</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </Select>
          ) : (
            <Select value="me" disabled>
              <option value="me">我负责的</option>
            </Select>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="暂无用户"
          description="先录一个新生，开始建联跟进"
          action={
            <Button asChild className="mt-2">
              <Link href="/users/new">新增用户</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="stagger space-y-3 md:hidden">
            {filtered.map((u) => (
              <UserCard key={u.id} user={u} showOwner={showOwnerFilter} />
            ))}
          </div>
          <div className="panel hidden overflow-hidden md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--surface-2)] text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">姓名</th>
                  <th className="px-4 py-3 font-medium">等级</th>
                  <th className="px-4 py-3 font-medium">阶段</th>
                  <th className="px-4 py-3 font-medium">专业</th>
                  <th className="px-4 py-3 font-medium">负责人</th>
                  <th className="px-4 py-3 font-medium">待办</th>
                  <th className="px-4 py-3 font-medium">更新</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr
                    key={u.id}
                    className="border-t border-[var(--line)]/70 hover:bg-white/60"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/users/${u.id}`}
                        className="font-medium text-[var(--lake)]"
                      >
                        {u.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <LevelBadge level={u.level} />
                    </td>
                    <td className="px-4 py-3">
                      <StageBadge stage={u.stage} />
                    </td>
                    <td className="px-4 py-3">{u.major || "—"}</td>
                    <td className="px-4 py-3">{u.owner?.full_name || "—"}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {u.next_action || "—"}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">
                      {formatDate(u.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function UserCard({
  user,
  showOwner,
}: {
  user: CampusUser;
  showOwner: boolean;
}) {
  return (
    <Link
      href={`/users/${user.id}`}
      className="panel block p-4 transition hover:border-[var(--accent)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold">{user.name}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {user.major || "未填专业"} · {user.channel || "未知渠道"}
            {showOwner ? ` · ${user.owner?.full_name || "—"}` : ""}
          </p>
        </div>
        <div className="flex gap-1.5">
          <LevelBadge level={user.level} />
          <StageBadge stage={user.stage} />
        </div>
      </div>
      {user.next_action ? (
        <p className="mt-3 line-clamp-2 text-sm text-[var(--ink-soft)]">
          待办：{user.next_action}
          {user.next_action_due ? `（${formatDate(user.next_action_due)}）` : ""}
        </p>
      ) : null}
    </Link>
  );
}

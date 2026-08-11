"use client";

import { useMemo, useState } from "react";
import { STAGES } from "@/lib/constants";
import { useSession } from "@/components/providers/session-provider";
import { listProfiles, listRecordings } from "@/lib/data";
import { useLiveQuery } from "@/lib/data/use-live-query";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty";
import { LoadingBlock } from "@/components/ui/loading";
import { StageBadge } from "@/components/users/stage-badge";
import { formatDateTime } from "@/lib/utils";

export default function RecordingsPage() {
  const { profile, isT0 } = useSession();
  const [memberId, setMemberId] = useState("all");
  const [stage, setStage] = useState("all");
  const [userId, setUserId] = useState("all");

  const { data: profiles = [] } = useLiveQuery(() => listProfiles(), []);
  const { data: recordings = [], loading } = useLiveQuery(
    async () => (profile ? listRecordings(profile) : []),
    [profile?.id, profile?.role],
  );

  const members = profiles.filter((p) => p.role !== "T0");

  const users = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of recordings) {
      if (r.user) map.set(r.user.id, r.user.name);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [recordings]);

  const filtered = recordings.filter((r) => {
    if (memberId !== "all" && r.owner_id !== memberId) return false;
    if (stage !== "all" && r.stage !== stage) return false;
    if (userId !== "all" && r.user_id !== userId) return false;
    return true;
  });

  if (loading) return <LoadingBlock />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="section-title text-2xl md:text-3xl">录音库</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {isT0 ? "全部录音" : "我上传的录音"} · 支持在线播放
        </p>
      </div>

      <div className="panel grid grid-cols-1 gap-2 p-3 md:grid-cols-3">
        {isT0 ? (
          <Select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
            <option value="all">全部成员</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name}
              </option>
            ))}
          </Select>
        ) : (
          <Select disabled value="me">
            <option value="me">我的录音</option>
          </Select>
        )}
        <Select value={userId} onChange={(e) => setUserId(e.target.value)}>
          <option value="all">全部用户</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>
        <Select value={stage} onChange={(e) => setStage(e.target.value)}>
          <option value="all">全部阶段</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="暂无录音"
          description="在用户详情推进阶段时可上传面试/规划/关单录音"
        />
      ) : (
        <div className="stagger space-y-3">
          {filtered.map((r) => (
            <article key={r.id} className="panel p-4">
              <div className="flex flex-wrap items-center gap-2">
                <StageBadge stage={r.stage} />
                <span className="font-medium">{r.user?.name}</span>
                <span className="text-xs text-[var(--muted)]">
                  {r.owner?.full_name} · {formatDateTime(r.created_at)}
                </span>
              </div>
              <p className="mt-2 text-sm text-[var(--ink-soft)]">
                {r.note || "（无备注）"}
              </p>
              {r.record_url?.startsWith("demo://") ? (
                <p className="mt-3 rounded-xl bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--muted)]">
                  演示占位录音：{r.record_url}
                </p>
              ) : r.record_url &&
                (r.record_url.startsWith("http") ||
                  r.record_url.startsWith("blob:")) ? (
                <audio
                  className="mt-3 w-full"
                  controls
                  src={r.record_url}
                />
              ) : (
                <p className="mt-3 text-xs text-[var(--muted)]">
                  录音路径：{r.record_url}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

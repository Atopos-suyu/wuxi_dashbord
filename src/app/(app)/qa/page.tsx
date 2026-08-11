"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { QA_STATUS_LABEL, STAGES_REQUIRE_RECORDING } from "@/lib/constants";
import { useSession } from "@/components/providers/session-provider";
import { listQaQueue, reviewStageLog } from "@/lib/data";
import { useLiveQuery } from "@/lib/data/use-live-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty";
import { LoadingBlock } from "@/components/ui/loading";
import { StageBadge } from "@/components/users/stage-badge";
import { formatDateTime } from "@/lib/utils";

export default function QaPage() {
  const { profile, canSeeMembers, loading: sessionLoading } = useSession();
  const router = useRouter();
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!sessionLoading && !canSeeMembers) router.replace("/users");
  }, [sessionLoading, canSeeMembers, router]);

  const { data: queue = [], loading, reload } = useLiveQuery(
    async () => (profile && canSeeMembers ? listQaQueue(profile) : []),
    [profile?.id, canSeeMembers],
  );

  if (sessionLoading || !canSeeMembers || loading) return <LoadingBlock />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="section-title text-2xl md:text-3xl">录音质检</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {STAGES_REQUIRE_RECORDING.join(" / ")} 阶段强制录音 · 待抽听{" "}
          <span className="font-semibold text-[var(--accent)]">{queue.length}</span>{" "}
          条
        </p>
      </div>

      {queue.length === 0 ? (
        <EmptyState
          title="暂无待抽听录音"
          description="成员推进职规/关单并上传录音后会出现在这里"
        />
      ) : (
        <div className="space-y-3">
          {queue.map((r) => (
            <article key={r.id} className="panel space-y-3 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <StageBadge stage={r.stage} />
                <Badge className="bg-amber-100 text-amber-900">
                  {QA_STATUS_LABEL.pending}
                </Badge>
                <Link
                  href={`/users/${r.user_id}`}
                  className="font-medium text-[var(--lake)]"
                >
                  {r.user?.name || "用户"}
                </Link>
                <span className="text-xs text-[var(--muted)]">
                  {r.owner?.full_name} · {formatDateTime(r.created_at)}
                </span>
              </div>
              {r.note ? (
                <p className="text-sm text-[var(--ink-soft)]">{r.note}</p>
              ) : null}
              {r.record_url &&
              (r.record_url.startsWith("http") ||
                r.record_url.startsWith("blob:")) ? (
                <audio controls className="w-full" src={r.record_url} />
              ) : (
                <p className="text-xs text-[var(--muted)]">
                  录音：{r.record_url}
                </p>
              )}
              <Input
                placeholder="质检备注（可选）"
                value={notes[r.id] ?? ""}
                onChange={(e) =>
                  setNotes({ ...notes, [r.id]: e.target.value })
                }
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={async () => {
                    if (!profile) return;
                    await reviewStageLog(r.id, {
                      qa_status: "passed",
                      qa_note: notes[r.id] ?? "",
                      qa_by: profile.id,
                    });
                    reload();
                    toast.success("已标记合格");
                  }}
                >
                  合格
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    if (!profile) return;
                    await reviewStageLog(r.id, {
                      qa_status: "rejected",
                      qa_note: notes[r.id] || "需复盘",
                      qa_by: profile.id,
                    });
                    reload();
                    toast.success("已标记需复盘");
                  }}
                >
                  需复盘
                </Button>
                <Button asChild size="sm" variant="ghost">
                  <Link href={`/users/${r.user_id}`}>看用户</Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

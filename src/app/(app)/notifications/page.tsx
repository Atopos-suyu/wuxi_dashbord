"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSession } from "@/components/providers/session-provider";
import {
  loadWorkbenchSnapshot,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/data";
import { useLiveQuery } from "@/lib/data/use-live-query";
import { unreadCount } from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty";
import { LoadingBlock } from "@/components/ui/loading";
import { formatDateTime } from "@/lib/utils";

export default function NotificationsPage() {
  const { profile, canSeeRegion, loading: sessionLoading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!sessionLoading && !canSeeRegion) router.replace("/users");
  }, [sessionLoading, canSeeRegion, router]);

  const { data, loading, reload } = useLiveQuery(
    async () =>
      profile && canSeeRegion ? loadWorkbenchSnapshot(profile) : null,
    [profile?.id, canSeeRegion],
  );

  const rows = data?.notifications ?? [];
  const unread = profile ? unreadCount(rows, profile.id) : 0;

  if (sessionLoading || !canSeeRegion || loading) return <LoadingBlock />;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="section-title text-2xl md:text-3xl">站内通知</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            未读 {unread} · 由红黄预警自动生成
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          disabled={!unread}
          onClick={async () => {
            if (!profile) return;
            await markAllNotificationsRead(profile.id);
            reload();
            toast.success("已全部标为已读");
          }}
        >
          全部已读
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="暂无通知" description="出现红黄预警后会自动推送到这里" />
      ) : (
        <div className="space-y-3">
          {rows.map((n) => (
            <article
              key={n.id}
              className={`panel space-y-2 p-4 ${n.read_at ? "opacity-70" : ""}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  className={
                    n.level === "red"
                      ? "bg-rose-100 text-rose-800"
                      : n.level === "yellow"
                        ? "bg-amber-100 text-amber-900"
                        : "bg-[var(--surface-2)] text-[var(--ink-soft)]"
                  }
                >
                  {n.level === "red" ? "红" : n.level === "yellow" ? "黄" : "讯"}
                </Badge>
                <p className="font-medium">{n.title}</p>
                {!n.read_at ? (
                  <span className="text-[10px] font-semibold text-[var(--accent)]">
                    NEW
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-[var(--ink-soft)]">{n.body}</p>
              <p className="text-xs text-[var(--muted)]">
                {formatDateTime(n.created_at)}
              </p>
              <div className="flex flex-wrap gap-2">
                {n.link ? (
                  <Button asChild size="sm">
                    <Link
                      href={n.link}
                      onClick={async () => {
                        if (!n.read_at) {
                          await markNotificationRead(n.id);
                          reload();
                        }
                      }}
                    >
                      去处理
                    </Link>
                  </Button>
                ) : null}
                {!n.read_at ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      await markNotificationRead(n.id);
                      reload();
                    }}
                  >
                    标为已读
                  </Button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

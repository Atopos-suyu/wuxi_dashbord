"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AREAS,
  MEMBER_STATUSES,
  MEMBER_STATUS_LABEL,
  ROLE_LABEL,
  ROLES,
  type Area,
  type MemberStatus,
  type Role,
} from "@/lib/constants";
import { useSession } from "@/components/providers/session-provider";
import { listProfiles, updateProfile } from "@/lib/data";
import { useLiveQuery } from "@/lib/data/use-live-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { LoadingBlock } from "@/components/ui/loading";
import type { Profile } from "@/lib/types";

export default function OrgPage() {
  const { profile, canManageOrg, loading: sessionLoading } = useSession();
  const router = useRouter();
  const { data: profiles = [], loading, reload } = useLiveQuery(
    () => listProfiles(),
    [],
  );
  const [drafts, setDrafts] = useState<Record<string, Partial<Profile>>>({});

  useEffect(() => {
    if (!sessionLoading && !canManageOrg) router.replace("/users");
  }, [sessionLoading, canManageOrg, router]);

  const managers = useMemo(
    () => profiles.filter((p) => p.role === "T3" || p.role === "T2" || p.role === "T1"),
    [profiles],
  );

  function patch(id: string, next: Partial<Profile>) {
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...next } }));
  }

  function valueOf<K extends keyof Profile>(p: Profile, key: K): Profile[K] {
    const d = drafts[p.id];
    return (d && d[key] !== undefined ? d[key] : p[key]) as Profile[K];
  }

  if (sessionLoading || !canManageOrg || loading) return <LoadingBlock />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="section-title text-2xl md:text-3xl">组织管理</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          T3 调整角色、片区、上级与成员状态 · 共 {profiles.length} 人
        </p>
      </div>

      <div className="space-y-3">
        {profiles.map((p) => (
          <article key={p.id} className="panel space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Input
                className="max-w-xs font-medium"
                value={String(valueOf(p, "full_name") ?? "")}
                onChange={(e) => patch(p.id, { full_name: e.target.value })}
              />
              <span className="text-xs text-[var(--muted)]">{p.id.slice(0, 8)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <Select
                value={String(valueOf(p, "role"))}
                onChange={(e) => patch(p.id, { role: e.target.value as Role })}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </Select>
              <Select
                value={String(valueOf(p, "area") ?? "")}
                onChange={(e) =>
                  patch(p.id, { area: (e.target.value || null) as Area | null })
                }
              >
                <option value="">无片区</option>
                {AREAS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </Select>
              <Select
                value={String(valueOf(p, "manager_id") ?? "")}
                onChange={(e) =>
                  patch(p.id, { manager_id: e.target.value || null })
                }
              >
                <option value="">无上级</option>
                {managers
                  .filter((m) => m.id !== p.id)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name}（{ROLE_LABEL[m.role]}）
                    </option>
                  ))}
              </Select>
              <Select
                value={String(valueOf(p, "status"))}
                onChange={(e) =>
                  patch(p.id, { status: e.target.value as MemberStatus })
                }
              >
                {MEMBER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {MEMBER_STATUS_LABEL[s]}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              size="sm"
              disabled={!drafts[p.id]}
              onClick={async () => {
                const d = drafts[p.id];
                if (!d) return;
                await updateProfile(p.id, d);
                setDrafts((prev) => {
                  const next = { ...prev };
                  delete next[p.id];
                  return next;
                });
                reload();
                toast.success(`${d.full_name ?? p.full_name} 已更新`);
              }}
            >
              保存
            </Button>
          </article>
        ))}
      </div>
    </div>
  );
}

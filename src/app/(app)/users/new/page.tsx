"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CHANNELS,
  DEFAULT_SIX_DIM_SCORE,
  MAJORS,
  PARENT_ATTITUDES,
  STAGES,
  type Stage,
} from "@/lib/constants";
import { useSession } from "@/components/providers/session-provider";
import { listProfiles, upsertUser } from "@/lib/data";
import { useLiveQuery } from "@/lib/data/use-live-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function NewUserPage() {
  const router = useRouter();
  const { profile, canSeeMembers } = useSession();
  const { data: profiles = [] } = useLiveQuery(() => listProfiles(), []);
  const members = profiles.filter(
    (p) => p.role === "T0" || p.role === "伪T0" || p.role === "T1",
  );

  const [form, setForm] = useState<{
    name: string;
    major: string;
    contact: string;
    channel: string;
    owner_id: string;
    stage: Stage;
    parent_attitude: string;
    family_situation: string;
    next_action: string;
    next_action_due: string;
    remark: string;
  }>({
    name: "",
    major: MAJORS[0],
    contact: "",
    channel: CHANNELS[0],
    owner_id: profile?.id ?? "",
    stage: "建联",
    parent_attitude: PARENT_ATTITUDES[3],
    family_situation: "",
    next_action: "",
    next_action_due: "",
    remark: "",
  });
  const [saving, setSaving] = useState(false);

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="section-title text-2xl">新增用户</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          手机也可快速录入新生信息
        </p>
      </div>

      <form
        className="panel space-y-4 p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!profile) return;
          setSaving(true);
          try {
            const user = await upsertUser({
              ...form,
              owner_id: canSeeMembers
                ? form.owner_id || profile.id
                : profile.id,
              school_region: profile.school_region,
              area: profile.area ?? null,
              next_action_due: form.next_action_due || null,
              six_dim_score: DEFAULT_SIX_DIM_SCORE,
              deal_amount: null,
            });
            toast.success("已创建用户");
            router.replace(`/users/${user?.id}`);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "创建失败");
          } finally {
            setSaving(false);
          }
        }}
      >
        <Field label="姓名">
          <Input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="专业">
            <Select
              value={form.major}
              onChange={(e) => setForm({ ...form, major: e.target.value })}
            >
              {MAJORS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="渠道">
            <Select
              value={form.channel}
              onChange={(e) => setForm({ ...form, channel: e.target.value })}
            >
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="联系方式（QQ/微信）">
          <Input
            value={form.contact}
            onChange={(e) => setForm({ ...form, contact: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="阶段">
            <Select
              value={form.stage}
              onChange={(e) =>
                setForm({ ...form, stage: e.target.value as Stage })
              }
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="家长态度">
            <Select
              value={form.parent_attitude}
              onChange={(e) =>
                setForm({ ...form, parent_attitude: e.target.value })
              }
            >
              {PARENT_ATTITUDES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {canSeeMembers ? (
          <Field label="负责人">
            <Select
              value={form.owner_id || profile?.id}
              onChange={(e) => setForm({ ...form, owner_id: e.target.value })}
            >
              <option value={profile?.id}>{profile?.full_name}（我）</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
        <Field label="下一步待办">
          <Input
            value={form.next_action}
            onChange={(e) => setForm({ ...form, next_action: e.target.value })}
          />
        </Field>
        <Field label="待办截止">
          <Input
            type="date"
            value={form.next_action_due}
            onChange={(e) =>
              setForm({ ...form, next_action_due: e.target.value })
            }
          />
        </Field>
        <Field label="家庭情况">
          <Textarea
            value={form.family_situation}
            onChange={(e) =>
              setForm({ ...form, family_situation: e.target.value })
            }
          />
        </Field>
        <Field label="备注">
          <Textarea
            value={form.remark}
            onChange={(e) => setForm({ ...form, remark: e.target.value })}
          />
        </Field>
        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={() => router.back()}
          >
            取消
          </Button>
          <Button type="submit" className="flex-1" disabled={saving}>
            {saving ? "保存中…" : "创建"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ROLES, type Role } from "@/lib/constants";
import { useSession } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { LoadingBlock } from "@/components/ui/loading";

export default function OnboardingPage() {
  const router = useRouter();
  const { profile, loading, completeOnboarding } = useSession();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [role, setRole] = useState<Role>(profile?.role ?? "T2");
  const [saving, setSaving] = useState(false);

  if (loading) return <LoadingBlock />;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md items-center px-4">
      <div className="panel w-full p-6 animate-fade-up">
        <p className="section-title text-2xl">完善档案</p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          首次登录请填写姓名与角色，便于团队协作。
        </p>
        <form
          className="mt-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            try {
              await completeOnboarding({ full_name: fullName, role });
              toast.success("档案已保存");
              router.replace(role === "T0" ? "/dashboard" : "/users");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "保存失败");
            } finally {
              setSaving(false);
            }
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="name">姓名</Label>
            <Input
              id="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">角色</Label>
            <Select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </div>
          <Button className="w-full" disabled={saving} type="submit">
            {saving ? "保存中…" : "进入工作台"}
          </Button>
        </form>
      </div>
    </div>
  );
}

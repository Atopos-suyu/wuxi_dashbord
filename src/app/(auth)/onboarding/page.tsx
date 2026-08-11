"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AREAS,
  Area,
  DEFAULT_SCHOOL_REGION,
  Role,
  ROLE_LABEL,
  ROLES,
  SCHOOL_REGIONS,
  type SchoolRegion,
} from "@/lib/constants";
import { canSeeRegionDashboard } from "@/lib/permissions";
import { useSession } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { LoadingBlock } from "@/components/ui/loading";

export default function OnboardingPage() {
  const router = useRouter();
  const { profile, loading, completeOnboarding } = useSession();
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("T0");
  const [area, setArea] = useState<Area | "">("");
  const [schoolRegion, setSchoolRegion] = useState<SchoolRegion>(DEFAULT_SCHOOL_REGION);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setRole(profile.role ?? "T0");
    setArea((profile.area as Area) ?? "");
    setSchoolRegion((profile.school_region as SchoolRegion) || DEFAULT_SCHOOL_REGION);
  }, [profile?.id]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if ((role === "T2" || role === "T1") && !area) {
        throw new Error("请选择专业片区");
      }
      await completeOnboarding({
        full_name: fullName,
        role,
        area: area || null,
        school_region: schoolRegion,
      });
      toast.success("资料已保存");
      router.replace(canSeeRegionDashboard(role) ? "/overview" : "/users");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingBlock />;

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="atmosphere-blob atmosphere-blob-a" />
        <div className="atmosphere-blob atmosphere-blob-b" />
      </div>

      <div className="panel relative z-10 p-6 animate-fade-up">
        <p className="text-sm font-medium text-[var(--lake)]">完善资料</p>
        <h1 className="section-title mt-2 text-2xl">开始使用工作台</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          确认姓名、校区、角色与片区后进入对应首页。
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
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
            <Label htmlFor="campus">校区</Label>
            <Select
              id="campus"
              value={schoolRegion}
              onChange={(e) => setSchoolRegion(e.target.value as SchoolRegion)}
            >
              {SCHOOL_REGIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
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
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </Select>
          </div>
          {(role === "T2" || role === "T1") && (
            <div className="space-y-2">
              <Label htmlFor="area">专业片区</Label>
              <Select
                id="area"
                value={area}
                required
                onChange={(e) => setArea(e.target.value as Area)}
              >
                <option value="">请选择</option>
                {AREAS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <Button className="w-full" disabled={saving} type="submit">
            {saving ? "保存中…" : "进入工作台"}
          </Button>
        </form>
      </div>
    </div>
  );
}

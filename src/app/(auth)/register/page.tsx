"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  APP_NAME,
  AREAS,
  Area,
  DEFAULT_SCHOOL_REGION,
  Role,
  ROLE_LABEL,
  ROLES,
} from "@/lib/constants";
import { listProfiles } from "@/lib/data";
import { useLiveQuery } from "@/lib/data/use-live-query";
import { isDemoMode } from "@/lib/mode";
import { createDemoProfile, setDemoSession } from "@/lib/demo/store";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export default function RegisterPage() {
  const router = useRouter();
  const demo = isDemoMode();
  const { data: profiles = [] } = useLiveQuery(() => listProfiles(), []);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("T0");
  const [area, setArea] = useState<Area | "">("");
  const [managerId, setManagerId] = useState("");
  const [loading, setLoading] = useState(false);

  const managers = useMemo(() => {
    if (role === "T2") return profiles.filter((p) => p.role === "T3");
    if (role === "T1")
      return profiles.filter((p) => p.role === "T2" && (!area || p.area === area));
    if (role === "T0" || role === "伪T0")
      return profiles.filter((p) => p.role === "T1");
    return [];
  }, [profiles, role, area]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if ((role === "T2" || role === "T1") && !area) {
        throw new Error("请选择专业片区");
      }
      if (role !== "T3" && !managerId && !demo) {
        throw new Error("请选择上级负责人");
      }

      if (demo) {
        const profile = createDemoProfile({
          full_name: fullName,
          role,
          area: area || null,
          manager_id: managerId || null,
        });
        setDemoSession(profile.id);
        toast.success("演示账号已创建");
        router.replace("/onboarding");
        router.refresh();
        return;
      }

      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role,
            area: area || null,
            manager_id: managerId || null,
            school_region: DEFAULT_SCHOOL_REGION,
          },
        },
      });
      if (error) throw error;
      if (data.user) {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          full_name: fullName,
          role,
          area: area || null,
          manager_id: managerId || null,
          school_region: DEFAULT_SCHOOL_REGION,
          status: "active",
        });
      }
      toast.success("注册成功");
      router.replace("/onboarding");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "注册失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="atmosphere-blob atmosphere-blob-a" />
        <div className="atmosphere-blob atmosphere-blob-b" />
      </div>

      <div className="panel relative z-10 p-6 animate-fade-up">
        <p className="section-title text-3xl text-[var(--ink)]">{APP_NAME}</p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {demo
            ? "演示模式：创建本地账号并进入引导。"
            : "创建账号后完善资料，再进入工作台。"}
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
          {!demo && (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">邮箱</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="role">角色</Label>
            <Select
              id="role"
              value={role}
              onChange={(e) => {
                setRole(e.target.value as Role);
                setManagerId("");
              }}
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
                onChange={(e) => {
                  setArea(e.target.value as Area);
                  setManagerId("");
                }}
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
          {role !== "T3" && (
            <div className="space-y-2">
              <Label htmlFor="manager">上级负责人</Label>
              <Select
                id="manager"
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
              >
                <option value="">
                  {demo ? "演示模式可稍后绑定" : "请选择"}
                </option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}（{ROLE_LABEL[m.role]}）
                  </option>
                ))}
              </Select>
            </div>
          )}
          <Button className="w-full" disabled={loading} type="submit">
            {loading ? "提交中…" : "注册并继续"}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-[var(--muted)]">
          已有账号？{" "}
          <Link className="text-[var(--lake)] underline" href="/login">
            去登录
          </Link>
        </p>
      </div>
    </div>
  );
}

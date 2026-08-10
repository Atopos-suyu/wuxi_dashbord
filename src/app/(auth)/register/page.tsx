"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { APP_NAME, ROLES, type Role } from "@/lib/constants";
import { isDemoMode } from "@/lib/mode";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export default function RegisterPage() {
  const router = useRouter();
  const demo = isDemoMode();
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("T2");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (demo) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md items-center px-4">
        <div className="panel w-full p-6">
          <p className="section-title text-2xl">演示模式无需注册</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            请返回登录页选择演示身份。
          </p>
          <Button className="mt-6 w-full" asChild>
            <Link href="/login">去登录</Link>
          </Button>
        </div>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, role },
        },
      });
      if (error) throw error;
      toast.success("注册成功，请完善档案");
      router.replace("/onboarding");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "注册失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="panel p-6 animate-fade-up">
        <p className="section-title text-3xl">{APP_NAME}</p>
        <p className="mt-2 text-sm text-[var(--muted)]">创建账号，加入无锡片区团队</p>
        <form className="mt-8 space-y-4" onSubmit={onSubmit}>
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
          <Button className="w-full" disabled={loading} type="submit">
            {loading ? "提交中…" : "注册"}
          </Button>
          <p className="text-center text-sm text-[var(--muted)]">
            已有账号？{" "}
            <Link href="/login" className="text-[var(--lake)] underline">
              登录
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

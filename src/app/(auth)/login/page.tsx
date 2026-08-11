"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { APP_NAME, ROLE_LABEL } from "@/lib/constants";
import { isDemoMode } from "@/lib/mode";
import { DEMO_PROFILES } from "@/lib/demo/seed-data";
import { canSeeRegionDashboard } from "@/lib/permissions";
import { useSession } from "@/components/providers/session-provider";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const demo = isDemoMode();
  const { loginDemo } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      let next = "/users";
      if (user) {
        const { data: me } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        if (me && canSeeRegionDashboard(me.role)) next = "/overview";
      }
      toast.success("登录成功");
      router.replace(next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="atmosphere-blob atmosphere-blob-a" />
        <div className="atmosphere-blob atmosphere-blob-b" />
      </div>

      <div className="panel relative z-10 p-6 animate-fade-up">
        <p className="section-title text-3xl text-[var(--ink)]">{APP_NAME}</p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          V2 监控闭环 · T3 看全盘 · 成员红绿灯 · 预警中心
        </p>

        {demo ? (
          <div className="mt-8 space-y-3">
            <p className="text-sm font-medium text-[var(--ink-soft)]">
              演示模式：选择身份进入
            </p>
            {DEMO_PROFILES.map((p) => (
              <button
                key={p.id}
                type="button"
                className="flex w-full items-center justify-between rounded-xl border border-[var(--line)] bg-white/70 px-4 py-3 text-left transition hover:border-[var(--accent)] hover:bg-white"
                onClick={() => {
                  loginDemo(p.id);
                  toast.success(`已进入：${p.full_name}`);
                  router.replace(
                    canSeeRegionDashboard(p.role) ? "/overview" : "/users",
                  );
                }}
              >
                <span>
                  <span className="block font-medium">{p.full_name}</span>
                  <span className="text-xs text-[var(--muted)]">
                    {ROLE_LABEL[p.role]}
                    {p.area ? ` · ${p.area}` : ""}
                  </span>
                </span>
                <span className="text-xs text-[var(--accent)]">进入</span>
              </button>
            ))}
          </div>
        ) : (
          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button className="w-full" disabled={loading} type="submit">
              {loading ? "登录中…" : "登录"}
            </Button>
            <p className="text-center text-sm text-[var(--muted)]">
              还没有账号？{" "}
              <Link href="/register" className="text-[var(--lake)] underline">
                注册
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

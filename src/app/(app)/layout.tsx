"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { useSession } from "@/components/providers/session-provider";
import { LoadingBlock } from "@/components/ui/loading";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !profile) {
      router.replace("/login");
    } else if (!loading && profile && !profile.full_name) {
      router.replace("/onboarding");
    }
  }, [loading, profile, router]);

  if (loading || !profile) return <LoadingBlock />;

  return <AppShell>{children}</AppShell>;
}

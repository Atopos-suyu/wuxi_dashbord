"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingBlock } from "@/components/ui/loading";

/** V2：原 T0 看板升级为片区总览 */
export default function DashboardRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/overview");
  }, [router]);
  return <LoadingBlock label="前往片区总览…" />;
}

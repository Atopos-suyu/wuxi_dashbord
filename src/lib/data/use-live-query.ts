"use client";

import { useCallback, useEffect, useState } from "react";
import { useDemoTick } from "@/lib/demo/use-demo-db";
import { isDemoMode } from "@/lib/mode";

export function useLiveQuery<T>(
  loader: () => Promise<T>,
  deps: unknown[],
  initial?: T,
) {
  const tick = useDemoTick();
  const [data, setData] = useState<T | undefined>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void loader()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "加载失败");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, isDemoMode() ? tick : 0, nonce]);

  return { data, loading, error, reload, setData };
}

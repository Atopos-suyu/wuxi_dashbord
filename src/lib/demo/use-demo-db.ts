"use client";

import { useSyncExternalStore } from "react";
import { loadDemoDB, type DemoDB } from "@/lib/demo/store";

let version = 0;
const listeners = new Set<() => void>();

if (typeof window !== "undefined") {
  window.addEventListener("wxu-demo-updated", () => {
    version += 1;
    listeners.forEach((l) => l());
  });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getVersion() {
  return version;
}

/** 订阅演示库变更，返回当前 DemoDB 快照 */
export function useDemoDB(): DemoDB {
  useSyncExternalStore(subscribe, getVersion, () => 0);
  return loadDemoDB();
}

export function useDemoTick() {
  return useSyncExternalStore(subscribe, getVersion, () => 0);
}

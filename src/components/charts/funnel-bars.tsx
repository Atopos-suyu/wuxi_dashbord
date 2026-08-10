"use client";

import { STAGE_COLORS, type Stage } from "@/lib/constants";

export function FunnelBars({
  data,
}: {
  data: { stage: Stage; count: number }[];
}) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="space-y-3 animate-fade-up">
      {data.map((item, index) => (
        <div key={item.stage} className="space-y-1" style={{ animationDelay: `${index * 40}ms` }}>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--ink-soft)]">{item.stage}</span>
            <span className="font-semibold tabular-nums">{item.count}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${(item.count / max) * 100}%`,
                background: STAGE_COLORS[item.stage],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

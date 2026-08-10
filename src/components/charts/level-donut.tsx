"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { LEVEL_COLORS, type Level } from "@/lib/constants";

export function LevelDonut({
  data,
}: {
  data: { level: Level; count: number }[];
}) {
  const filtered = data.filter((d) => d.count > 0);
  return (
    <div className="flex items-center gap-4 animate-fade-up">
      <div className="h-44 w-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={filtered}
              dataKey="count"
              nameKey="level"
              innerRadius={48}
              outerRadius={70}
              paddingAngle={3}
            >
              {filtered.map((entry) => (
                <Cell key={entry.level} fill={LEVEL_COLORS[entry.level]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-2 text-sm">
        {data.map((d) => (
          <div key={d.level} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: LEVEL_COLORS[d.level] }}
            />
            <span className="text-[var(--ink-soft)]">{d.level} 级</span>
            <span className="ml-auto font-semibold tabular-nums">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

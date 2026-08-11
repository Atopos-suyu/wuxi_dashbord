"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function TrendLine({
  data,
  lines,
}: {
  data: { period: string; [key: string]: string | number }[];
  lines: { key: string; color: string; name: string }[];
}) {
  return (
    <div className="h-56 w-full animate-fade-up">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,45,58,0.08)" />
          <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#3D5A66" }} />
          <YAxis domain={[0, 5]} tick={{ fontSize: 11, fill: "#7A939D" }} />
          <Tooltip />
          {lines.map((l) => (
            <Line
              key={l.key}
              type="monotone"
              dataKey={l.key}
              name={l.name}
              stroke={l.color}
              strokeWidth={2.5}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart as ReRadar,
  ResponsiveContainer,
  Legend,
} from "recharts";

export function ScoreRadar({
  data,
  series,
  max = 5,
}: {
  data: { subject: string; [key: string]: string | number }[];
  series: { key: string; color: string; name: string }[];
  max?: number;
}) {
  return (
    <div className="h-64 w-full animate-fade-up">
      <ResponsiveContainer width="100%" height="100%">
        <ReRadar data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="rgba(15, 45, 58, 0.15)" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: "#3D5A66", fontSize: 11 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, max]}
            tick={{ fill: "#7A939D", fontSize: 10 }}
          />
          {series.map((s) => (
            <Radar
              key={s.key}
              name={s.name}
              dataKey={s.key}
              stroke={s.color}
              fill={s.color}
              fillOpacity={0.25}
            />
          ))}
          <Legend />
        </ReRadar>
      </ResponsiveContainer>
    </div>
  );
}

"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type PieChartPanelProps = {
  data: Record<string, unknown>[];
  valueKey: string;
  nameKey: string;
  title: string;
};

const palette = ["#00e5ff", "#32d74b", "#fe9900", "#ff453a", "#5e5ce6", "#64d2ff", "#bf5af2"];

export function PieChartPanel({ data, valueKey, nameKey, title }: PieChartPanelProps) {
  return (
    <div className="h-[320px] rounded-lg border border-border bg-bg p-3">
      <p className="mb-2 text-sm text-muted">{title}</p>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey={valueKey} nameKey={nameKey} outerRadius={110} label>
            {data.map((_, index) => (
              <Cell key={index} fill={palette[index % palette.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}


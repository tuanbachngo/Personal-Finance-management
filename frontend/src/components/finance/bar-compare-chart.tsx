"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type BarCompareChartProps = {
  data: Record<string, unknown>[];
  categoryKey: string;
  series: { key: string; color: string; label: string }[];
  title: string;
};

export function BarCompareChart({ data, categoryKey, series, title }: BarCompareChartProps) {
  return (
    <div className="h-[320px] rounded-lg border border-border bg-bg p-3">
      <p className="mb-2 text-sm text-muted">{title}</p>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
          <XAxis
            dataKey={categoryKey}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#6B7280", fontSize: 12 }}
            dy={10}
          />
          <YAxis
            width={90}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#6B7280", fontSize: 12 }}
            tickFormatter={(value) => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E5E7EB",
              borderRadius: "8px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              color: "#111827"
            }}
            formatter={(value: number) => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value)}
          />
          <Legend />
          {series.map((entry) => (
            <Bar key={entry.key} dataKey={entry.key} fill={entry.color} name={entry.label} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}


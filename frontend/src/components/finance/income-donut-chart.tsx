"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type IncomeGroup = {
  AccountName: string;
  TotalIncome: number;
};

type Props = {
  data: IncomeGroup[];
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0
  }).format(value);
}

// Cool tones for income
const COLORS = ["#10B981", "#059669", "#34D399", "#06B6D4", "#3B82F6", "#6366F1"];

export function IncomeDonutChart({ data }: Props) {
  const totalIncome = useMemo(() => data.reduce((sum, item) => sum + Number(item.TotalIncome), 0), [data]);

  return (
    <div className="h-[400px] w-full rounded-xl border border-border bg-surface p-5 shadow-sm">
      <h2 className="mb-6 text-lg font-semibold tracking-tight text-text">Income by Account</h2>
      <div className="relative h-[300px] w-full">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted">No income data</p>
          </div>
        ) : (
          <>
            <div className="pointer-events-none absolute inset-0 mt-2 flex flex-col items-center justify-center">
              <span className="text-xs uppercase tracking-wider text-muted">Total Income</span>
              <span className="mt-1 font-mono text-2xl font-bold tracking-tight text-text">
                {formatNumber(totalIncome)}
              </span>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={90}
                  outerRadius={120}
                  paddingAngle={2}
                  dataKey="TotalIncome"
                  nameKey="AccountName"
                  stroke="none"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    color: "#111827"
                  }}
                  formatter={(value: number) => formatNumber(value)}
                />
              </PieChart>
            </ResponsiveContainer>
          </>
        )}
      </div>
    </div>
  );
}

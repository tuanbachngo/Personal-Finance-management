"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import type { MonthlyTrendPoint } from "@/types/api";
import type { ReactNode } from "react";

type Props = {
  data: MonthlyTrendPoint[];
  headerActions?: ReactNode;
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0
  }).format(value);
}

export function CashFlowChart({ data, headerActions }: Props) {
  return (
    <div className="h-[400px] w-full rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-text">Cash Flow</h2>
        {headerActions ? <div className="flex items-center gap-2">{headerActions}</div> : null}
      </div>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barGap={2} barSize={12}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis
              dataKey="YearMonth"
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
              tickFormatter={formatNumber}
            />
            <Tooltip
              cursor={{ fill: "#F3F4F6" }}
              contentStyle={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                color: "#111827"
              }}
              formatter={(value: number) => formatNumber(value)}
            />
            <Bar dataKey="MonthlyIncome" fill="#10B981" name="Income" radius={[4, 4, 0, 0]} />
            <Bar dataKey="MonthlyExpense" fill="#EF4444" name="Expense" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

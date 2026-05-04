"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import type { MonthlyTrendPoint } from "@/types/api";

type ChartPanelProps = {
  data: MonthlyTrendPoint[];
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0
  }).format(value);
}

export function ChartPanel({ data }: ChartPanelProps) {
  return (
    <div className="h-[400px] w-full rounded-xl border border-border bg-surface p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-text tracking-tight mb-6">Cash Flow Trend</h2>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
              </linearGradient>
            </defs>
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
              contentStyle={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                color: "#111827"
              }}
              formatter={(value: number) => formatNumber(value)}
            />
            <Area type="monotone" dataKey="MonthlyIncome" stroke="#10B981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} name="Income" />
            <Area type="monotone" dataKey="MonthlyExpense" stroke="#EF4444" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} name="Expense" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}


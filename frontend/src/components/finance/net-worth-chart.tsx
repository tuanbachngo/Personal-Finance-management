"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import type { BalanceHistoryRecord } from "@/types/api";

type Props = {
  data: BalanceHistoryRecord[];
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0
  }).format(value);
}

const TIME_FILTERS = ["1M", "1Y", "2Y", "3Y", "5Y", "10Y", "ALL"];

export function NetWorthChart({ data }: Props) {
  const [timeRange, setTimeRange] = useState<string>("ALL");

  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    if (timeRange === "ALL") return data;

    // Use the latest transaction date as the baseline, or current date if preferred.
    // Usually, the latest point in data is the most sensible baseline for financial charts.
    const sortedData = [...data].sort((a, b) => new Date(a.TransactionDate).getTime() - new Date(b.TransactionDate).getTime());
    const latestDate = new Date(sortedData[sortedData.length - 1].TransactionDate);
    const cutoffDate = new Date(latestDate);

    switch (timeRange) {
      case "1M": cutoffDate.setMonth(cutoffDate.getMonth() - 1); break;
      case "1Y": cutoffDate.setFullYear(cutoffDate.getFullYear() - 1); break;
      case "2Y": cutoffDate.setFullYear(cutoffDate.getFullYear() - 2); break;
      case "3Y": cutoffDate.setFullYear(cutoffDate.getFullYear() - 3); break;
      case "5Y": cutoffDate.setFullYear(cutoffDate.getFullYear() - 5); break;
      case "10Y": cutoffDate.setFullYear(cutoffDate.getFullYear() - 10); break;
    }

    return sortedData.filter(d => new Date(d.TransactionDate) >= cutoffDate);
  }, [data, timeRange]);

  const stats = useMemo(() => {
    if (filteredData.length < 2) return null;
    const first = filteredData[0].RunningBalance;
    const last = filteredData[filteredData.length - 1].RunningBalance;
    const delta = last - first;
    const percentage = first !== 0 ? (delta / Math.abs(first)) * 100 : 0;
    return {
      delta,
      percentage,
      isPositive: delta >= 0
    };
  }, [filteredData]);

  return (
    <div className="h-[450px] w-full rounded-xl border border-border bg-surface p-5 shadow-sm flex flex-col">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-text flex items-center gap-3">
            Net Worth
            {stats && (
              <div className={`flex items-center text-sm font-medium px-2.5 py-0.5 rounded-full ${stats.isPositive ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                {stats.isPositive ? "+" : ""}{formatNumber(stats.delta)} ({stats.isPositive ? "+" : ""}{stats.percentage.toFixed(2)}%)
              </div>
            )}
          </h2>
        </div>
        
        <div className="flex bg-bg rounded-lg p-1 border border-border">
          {TIME_FILTERS.map(filter => (
            <button
              key={filter}
              onClick={() => setTimeRange(filter)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                timeRange === filter 
                  ? "bg-surface text-text shadow-sm" 
                  : "text-muted hover:text-text"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 w-full min-h-0">
        {filteredData.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted">No history data for the selected period.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis
                dataKey="TransactionDate"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#6B7280", fontSize: 12 }}
                tickFormatter={(val: string) => {
                  const d = new Date(val);
                  return timeRange === "1M" 
                    ? `${d.getDate()}/${d.getMonth() + 1}` 
                    : `${d.getMonth() + 1}/${d.getFullYear().toString().slice(-2)}`;
                }}
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
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  color: "#111827"
                }}
                formatter={(value: number) => formatNumber(value)}
                labelFormatter={(label) => `Date: ${new Date(label).toLocaleDateString()}`}
              />
              <Area
                type="monotone"
                dataKey="RunningBalance"
                stroke="#3B82F6"
                fillOpacity={1}
                fill="url(#colorNetWorth)"
                strokeWidth={3}
                name="Balance"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

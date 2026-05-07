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

type TimeRange = "1M" | "1Y" | "2Y" | "3Y" | "5Y" | "10Y" | "ALL";

const TIME_FILTERS: TimeRange[] = ["1M", "1Y", "2Y", "3Y", "5Y", "10Y", "ALL"];

function formatNumber(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0
  }).format(value);
}

function formatSignedNumber(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value)}`;
}

function getCutoffDate(latestDate: Date, timeRange: TimeRange): Date | null {
  if (timeRange === "ALL") return null;

  const cutoffDate = new Date(latestDate);

  switch (timeRange) {
    case "1M":
      cutoffDate.setMonth(cutoffDate.getMonth() - 1);
      break;
    case "1Y":
      cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
      break;
    case "2Y":
      cutoffDate.setFullYear(cutoffDate.getFullYear() - 2);
      break;
    case "3Y":
      cutoffDate.setFullYear(cutoffDate.getFullYear() - 3);
      break;
    case "5Y":
      cutoffDate.setFullYear(cutoffDate.getFullYear() - 5);
      break;
    case "10Y":
      cutoffDate.setFullYear(cutoffDate.getFullYear() - 10);
      break;
  }

  return cutoffDate;
}

export function NetWorthChart({ data }: Props) {
  const [timeRange, setTimeRange] = useState<TimeRange>("ALL");

  const sortedData = useMemo(() => {
    return [...(data || [])].sort(
      (a, b) =>
        new Date(a.TransactionDate).getTime() - new Date(b.TransactionDate).getTime()
    );
  }, [data]);

  const filteredData = useMemo(() => {
    if (sortedData.length === 0) return [];
    if (timeRange === "ALL") return sortedData;

    const latestDate = new Date(sortedData[sortedData.length - 1].TransactionDate);
    const cutoffDate = getCutoffDate(latestDate, timeRange);

    if (!cutoffDate) return sortedData;

    return sortedData.filter(
      (row) => new Date(row.TransactionDate).getTime() >= cutoffDate.getTime()
    );
  }, [sortedData, timeRange]);

  const stats = useMemo(() => {
    if (filteredData.length < 2) return null;

    const first = Number(filteredData[0].RunningBalance || 0);
    const last = Number(filteredData[filteredData.length - 1].RunningBalance || 0);
    const delta = last - first;
    const percentage = first !== 0 ? (delta / Math.abs(first)) * 100 : 0;

    return {
      first,
      last,
      delta,
      percentage,
      isPositive: delta >= 0
    };
  }, [filteredData]);

  return (
    <section className="flex h-[450px] w-full flex-col rounded-2xl border border-border bg-surface p-5">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-text">Giá trị tài sản ròng</h2>

            {stats ? (
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                  stats.isPositive
                    ? "bg-success/10 text-success"
                    : "bg-danger/10 text-danger"
                }`}
              >
                {formatSignedNumber(stats.delta)} ({stats.isPositive ? "+" : ""}
                {stats.percentage.toFixed(2)}%)
              </span>
            ) : null}
          </div>

          <p className="mt-1 text-xs text-muted">
            Biến động số dư theo khoảng thời gian đã chọn.
          </p>
        </div>

        <div className="flex max-w-full overflow-x-auto rounded-xl border border-border bg-bg p-1">
          {TIME_FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setTimeRange(filter)}
              className={`focus-ring whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                timeRange === filter
                  ? "bg-primary text-bg"
                  : "text-muted hover:bg-surface-hover hover:text-text"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {filteredData.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border bg-bg">
            <p className="text-sm text-muted">Không có lịch sử số dư trong giai đoạn này.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={filteredData}
              margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#00E5FF" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid stroke="#2C2C2E" strokeDasharray="3 3" vertical={false} />

              <XAxis
                dataKey="TransactionDate"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#98989D", fontSize: 12 }}
                tickFormatter={(value: string) => {
                  const date = new Date(value);
                  return timeRange === "1M"
                    ? `${date.getDate()}/${date.getMonth() + 1}`
                    : `${date.getMonth() + 1}/${date.getFullYear().toString().slice(-2)}`;
                }}
                dy={10}
              />

              <YAxis
                width={92}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#98989D", fontSize: 12 }}
                tickFormatter={formatNumber}
              />

              <Tooltip
                cursor={{ stroke: "#00E5FF", strokeOpacity: 0.25 }}
                contentStyle={{
                  backgroundColor: "#1E1E1E",
                  border: "1px solid #2C2C2E",
                  borderRadius: "12px",
                  color: "#FFFFFF"
                }}
                labelStyle={{ color: "#98989D" }}
                itemStyle={{ color: "#00E5FF" }}
                formatter={(value: number) => [formatNumber(Number(value)), "Số dư"]}
                labelFormatter={(label) =>
                  `Ngày: ${new Date(label).toLocaleDateString("vi-VN")}`
                }
              />

              <Area
                type="monotone"
                dataKey="RunningBalance"
                stroke="#00E5FF"
                fill="url(#netWorthGradient)"
                fillOpacity={1}
                strokeWidth={3}
                name="Số dư"
                dot={{ r: 2.5, strokeWidth: 2, fill: "#121212", stroke: "#00E5FF" }}
                activeDot={{ r: 5, strokeWidth: 2, fill: "#00E5FF", stroke: "#121212" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { CategorySpendingPoint } from "@/types/api";

type Props = {
  data: CategorySpendingPoint[];
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0
  }).format(value);
}

const COLORS = ["#FF5A36", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899", "#6B7280"];

export function CategoryDonutChart({ data }: Props) {
  const totalSpent = useMemo(() => data.reduce((sum, item) => sum + Number(item.TotalSpent), 0), [data]);

  return (
    <div className="h-[400px] w-full rounded-xl border border-border bg-surface p-5 shadow-sm">
      <h2 className="mb-6 text-lg font-semibold tracking-tight text-text">Chi tiêu theo danh mục</h2>
      <div className="relative h-[300px] w-full">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted">Không có dữ liệu chi tiêu</p>
          </div>
        ) : (
          <>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2">
              <span className="text-xs uppercase tracking-wider text-muted">Tổng chi</span>
              <span className="text-2xl font-bold font-mono tracking-tight text-text mt-1">
                {formatNumber(totalSpent)}
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
                  dataKey="TotalSpent"
                  nameKey="CategoryName"
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

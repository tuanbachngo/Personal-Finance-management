"use client";

import { formatCurrency } from "@/lib/format";

type BudgetItem = {
  CategoryName: string;
  PlannedAmount: number;
  SpentAmount: number;
};

type Props = {
  title: string;
  data: BudgetItem[];
};

export function BudgetProgressBars({ title, data }: Props) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-text">{title}</h2>
        <div className="flex h-[200px] items-center justify-center">
          <p className="text-sm text-muted">No budget data available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <h2 className="mb-6 text-lg font-semibold tracking-tight text-text">{title}</h2>
      <div className="space-y-6">
        {data.map((item) => {
          const { CategoryName, PlannedAmount, SpentAmount } = item;
          // Calculate percentage. Cap at 100% for the visual bar width.
          const percentage = PlannedAmount > 0 ? Math.min((SpentAmount / PlannedAmount) * 100, 100) : 0;
          const isOverBudget = SpentAmount > PlannedAmount;
          
          return (
            <div key={CategoryName}>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-text">{CategoryName}</span>
                <span className="text-muted">
                  <span className={isOverBudget ? "text-red-500 font-bold" : "text-text font-semibold"}>
                    {formatCurrency(SpentAmount)}
                  </span>
                  {" "} / {formatCurrency(PlannedAmount)}
                </span>
              </div>
              
              {/* Background Bar (Budget Target) */}
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-border">
                {/* Fill Bar (Spent Amount) */}
                <div 
                  className={`absolute left-0 top-0 h-full rounded-full transition-all duration-700 ease-out ${
                    isOverBudget ? "bg-red-500" : "bg-primary"
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              
              {/* Over Budget Warning Indicator */}
              {isOverBudget && (
                <p className="mt-1.5 text-xs font-medium text-red-500 text-right">
                  Over budget by {formatCurrency(SpentAmount - PlannedAmount)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

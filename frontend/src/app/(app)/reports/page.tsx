"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip
} from "recharts";

import { AuthGuard } from "@/components/auth/auth-guard";
import { DataTable } from "@/components/common/data-table";
import { ErrorState } from "@/components/common/error-state";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { ChartPanel } from "@/components/finance/chart-panel";
import { SankeyCashFlow } from "@/components/finance/sankey-cash-flow";
import { AppShell } from "@/components/layout/app-shell";
import {
  extractApiErrorMessage,
  getCategorySpending,
  getDailySummary,
  getMetaAccounts,
  getTransactions,
} from "@/lib/api-client";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { useAuth } from "@/providers/auth-provider";
import { useUserScope } from "@/providers/user-scope-provider";
import type { CategorySpendingPoint, TransactionRecord } from "@/types/api";

type TransactionWithCategory = TransactionRecord & {
  CategoryName?: string | null;
};

const CATEGORY_COLORS = [
  "#06B6D4",
  "#22C55E",
  "#FACC15",
  "#F97316",
  "#8B5CF6",
  "#67E8F9",
  "#EC4899",
  "#2563EB",
  "#84CC16",
  "#14B8A6",
  "#F59E0B",
  "#94A3B8"
];

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function getDisplayName(user?: { UserName?: string | null; Email?: string | null } | null): string {
  const name = user?.UserName?.trim();

  if (name) {
    return name;
  }

  const emailName = user?.Email?.split("@")[0]?.trim();

  if (emailName) {
    return emailName;
  }

  return "your account";
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export default function ReportsPage() {
  const { user, isAdmin } = useAuth();
  const { selectedUserId, users } = useUserScope();

  const userId = isAdmin ? selectedUserId ?? user?.UserID : user?.UserID;
  const scopedUser =
    isAdmin && userId
      ? users.find((row) => row.UserID === userId)
      : user;
  const displayName = getDisplayName(scopedUser);

  const [activeTab, setActiveTab] = useState<"cash-flow" | "spending" | "income">("cash-flow");

  const now = new Date();
  const prev = new Date();
  prev.setDate(now.getDate() - 30);
  const [startDate, setStartDate] = useState(toIsoDate(prev));
  const [endDate, setEndDate] = useState(toIsoDate(now));
  const [dateRangeInitialized, setDateRangeInitialized] = useState(false);

  const categoryQuery = useQuery({
    queryKey: ["report-category", userId],
    queryFn: () => getCategorySpending(userId),
    enabled: Boolean(userId)
  });

  const dailyQuery = useQuery({
    queryKey: ["daily-summary", userId, startDate, endDate],
    queryFn: () =>
      getDailySummary({
        user_id: userId,
        start_date: startDate,
        end_date: endDate
      }),
    enabled: Boolean(userId)
  });

  const transactionsQuery = useQuery({
    queryKey: ["transactions", userId],
    queryFn: () => getTransactions({ user_id: userId }),
    enabled: Boolean(userId)
  });

  const accountsQuery = useQuery({
    queryKey: ["accounts", userId],
    queryFn: () => getMetaAccounts(userId),
    enabled: Boolean(userId)
  });

  useEffect(() => {
    if (dateRangeInitialized) {
      return;
    }

    const transactions = transactionsQuery.data || [];
    if (transactions.length === 0) {
      return;
    }

    const timestamps = transactions
      .map((row) => new Date(row.TransactionDate).getTime())
      .filter((value) => Number.isFinite(value));
    if (timestamps.length === 0) {
      return;
    }

    const maxTimestamp = Math.max(...timestamps);
    const autoEnd = new Date(maxTimestamp);
    const autoStart = new Date(maxTimestamp);
    autoStart.setDate(autoStart.getDate() - 30);

    setStartDate(toIsoDate(autoStart));
    setEndDate(toIsoDate(autoEnd));
    setDateRangeInitialized(true);
  }, [transactionsQuery.data, dateRangeInitialized]);

  const sankeyData = useMemo(() => {
    const txs = (transactionsQuery.data || []) as TransactionWithCategory[];

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const filteredTxs = txs.filter((transaction) => {
      const d = new Date(transaction.TransactionDate);
      return d >= start && d <= end;
    });

    let totalIncome = 0;
    let totalExpense = 0;
    const categoryMap = new Map<string, number>();

    filteredTxs.forEach((transaction) => {
      if (transaction.TransactionType === "INCOME") {
        totalIncome += Number(transaction.Amount);
      } else if (transaction.TransactionType === "EXPENSE") {
        totalExpense += Number(transaction.Amount);
        const categoryName = transaction.CategoryName || "Uncategorized";
        categoryMap.set(
          categoryName,
          (categoryMap.get(categoryName) || 0) + Number(transaction.Amount)
        );
      }
    });

    const savings = Math.max(0, totalIncome - totalExpense);

    const nodes = [
      { name: "Total Income", color: "#06B6D4" },
      { name: "Savings", color: "#10B981" }
    ];

    const links: { source: number; target: number; value: number }[] = [];

    if (totalIncome > 0) {
      links.push({ source: 0, target: 1, value: savings });

      let index = 0;
      categoryMap.forEach((spent, categoryName) => {
        nodes.push({
          name: categoryName,
          color: CATEGORY_COLORS[index % CATEGORY_COLORS.length]
        });
        links.push({ source: 0, target: index + 2, value: spent });
        index += 1;
      });
    }

    return { nodes, links };
  }, [transactionsQuery.data, startDate, endDate]);

  const incomeData = useMemo(() => {
    const txs = transactionsQuery.data || [];
    const accounts = accountsQuery.data || [];
    const incomeTxs = txs.filter((transaction) => transaction.TransactionType === "INCOME");

    const map = new Map<number, number>();

    incomeTxs.forEach((transaction) => {
      map.set(
        transaction.AccountID,
        (map.get(transaction.AccountID) || 0) + Number(transaction.Amount)
      );
    });

    return Array.from(map.entries()).map(([accountId, total]) => {
      const account = accounts.find((item) => item.AccountID === accountId);
      return {
        AccountName: account?.BankName || "Unknown source",
        TotalIncome: total
      };
    });
  }, [transactionsQuery.data, accountsQuery.data]);

  const incomeTotal = useMemo(() => {
    return incomeData.reduce((sum, row) => sum + Number(row.TotalIncome || 0), 0);
  }, [incomeData]);

  const incomeSourceRows = useMemo(() => {
    return incomeData.map((row) => ({
      Source: row.AccountName,
      "Total income": formatCurrency(row.TotalIncome),
      Share: incomeTotal > 0 ? formatPercent((row.TotalIncome / incomeTotal) * 100) : "0.0%"
    }));
  }, [incomeData, incomeTotal]);

  const incomeTransactionsTable = useMemo(() => {
    return (transactionsQuery.data || [])
      .filter((transaction) => transaction.TransactionType === "INCOME")
      .sort(
        (a, b) =>
          new Date(b.TransactionDate).getTime() -
          new Date(a.TransactionDate).getTime()
      )
      .map((row) => {
        const account = (accountsQuery.data || []).find(
          (item) => item.AccountID === row.AccountID
        );

        return {
          Date: formatDateTime(row.TransactionDate),
          Source: account?.BankName || "Unknown source",
          Amount: formatCurrency(row.Amount),
          Note: row.Description || ""
        };
      });
  }, [transactionsQuery.data, accountsQuery.data]);

  const categorySummaryRows = useMemo(() => {
    const rows = categoryQuery.data || [];
    const total = rows.reduce((sum, row) => sum + Number(row.TotalSpent || 0), 0);

    return rows.map((row) => ({
      Category: row.CategoryName,
      "Total spent": formatCurrency(row.TotalSpent),
      Share: total > 0 ? formatPercent((Number(row.TotalSpent) / total) * 100) : "0.0%",
      "Transactions": row.TotalTransactions
    }));
  }, [categoryQuery.data]);

  const spendingTransactionsRows = useMemo(() => {
    return (transactionsQuery.data || [])
      .filter((transaction) => transaction.TransactionType === "EXPENSE")
      .sort(
        (a, b) =>
          new Date(b.TransactionDate).getTime() -
          new Date(a.TransactionDate).getTime()
      )
      .map((row) => {
        const account = (accountsQuery.data || []).find(
          (item) => item.AccountID === row.AccountID
        );

        return {
          Date: formatDateTime(row.TransactionDate),
          Account: row.BankName || account?.BankName || "Unknown account",
          Category: row.CategoryName || "Uncategorized",
          Amount: formatCurrency(row.Amount),
          Description: row.Description || ""
        };
      });
  }, [transactionsQuery.data, accountsQuery.data]);

  const cashFlowLoading = transactionsQuery.isLoading || dailyQuery.isLoading;
  const spendingLoading = categoryQuery.isLoading;
  const incomeLoading = transactionsQuery.isLoading || accountsQuery.isLoading;

  const cashFlowError = transactionsQuery.error || dailyQuery.error;
  const spendingError = categoryQuery.error;
  const incomeError = transactionsQuery.error || accountsQuery.error;

  const activeLoading =
    activeTab === "cash-flow"
      ? cashFlowLoading
      : activeTab === "spending"
        ? spendingLoading
        : incomeLoading;

  const activeError =
    activeTab === "cash-flow"
      ? cashFlowError
      : activeTab === "spending"
        ? spendingError
        : incomeError;

  return (
    <AuthGuard>
      <AppShell
        title="Reports"
        subtitle={`Clear money insights for ${displayName}`}
      >
        {activeLoading ? <LoadingSkeleton label="Loading reports..." /> : null}

        {activeError ? (
          <ErrorState
            title="Unable to load report data"
            detail={extractApiErrorMessage(
              activeError,
              "Failed to load report data."
            )}
            onRetry={() => {
              if (activeTab === "cash-flow") {
                transactionsQuery.refetch();
                dailyQuery.refetch();
                return;
              }
              if (activeTab === "spending") {
                categoryQuery.refetch();
                return;
              }
              transactionsQuery.refetch();
              accountsQuery.refetch();
            }}
          />
        ) : null}

        <div className="mb-6 flex flex-col gap-4 border-b border-border md:flex-row md:items-end md:justify-between">
          <nav className="-mb-px flex space-x-8">
            <TabButton
              active={activeTab === "cash-flow"}
              onClick={() => setActiveTab("cash-flow")}
            >
              Cash Flow
            </TabButton>
            <TabButton
              active={activeTab === "spending"}
              onClick={() => setActiveTab("spending")}
            >
              Spending
            </TabButton>
            <TabButton
              active={activeTab === "income"}
              onClick={() => setActiveTab("income")}
            >
              Income
            </TabButton>
          </nav>

          {activeTab === "cash-flow" ? (
            <div className="mb-2 flex items-center space-x-3">
              <input
                type="date"
                value={startDate}
                onChange={(event) => {
                  setDateRangeInitialized(true);
                  setStartDate(event.target.value);
                }}
                className="focus-ring rounded-md border border-border bg-surface px-3 py-1.5 text-sm"
              />
              <span className="text-sm text-muted">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(event) => {
                  setDateRangeInitialized(true);
                  setEndDate(event.target.value);
                }}
                className="focus-ring rounded-md border border-border bg-surface px-3 py-1.5 text-sm"
              />
            </div>
          ) : null}
        </div>

        <div className="grid gap-6">
          {activeTab === "cash-flow" && !activeError ? (
            <>
              <SankeyCashFlow data={sankeyData} />
              <ChartPanel
                data={(dailyQuery.data || []).map((row) => ({
                  YearMonth: formatDate(row.SummaryDate),
                  MonthlyIncome: row.DailyIncome,
                  MonthlyExpense: row.DailyExpense,
                  NetSaving: row.NetSaving
                }))}
              />
            </>
          ) : null}

          {activeTab === "spending" && !activeError ? (
            <>
              <SpendingByCategoryCard data={categoryQuery.data || []} />
              <DataTable
                title="Summary"
                rows={categorySummaryRows}
                emptyMessage="No spending data found."
              />
              <DataTable
                title="Spending Transactions"
                rows={spendingTransactionsRows}
                emptyMessage="No spending transactions found."
              />
            </>
          ) : null}

          {activeTab === "income" && !activeError ? (
            <>
              <IncomeBySourceCard data={incomeData} />
              <DataTable
                title="Summary"
                rows={incomeSourceRows}
                emptyMessage="No income source data found."
              />
              <DataTable
                title="Income Transactions"
                rows={incomeTransactionsTable}
                emptyMessage="No income transactions found."
              />
            </>
          ) : null}
        </div>
      </AppShell>
    </AuthGuard>
  );
}

function TabButton({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted hover:border-border hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

function IncomeBySourceCard({
  data
}: {
  data: { AccountName: string; TotalIncome: number }[];
}) {
  const total = data.reduce((sum, row) => sum + Number(row.TotalIncome || 0), 0);
  const sortedData = [...data].sort((a, b) => Number(b.TotalIncome) - Number(a.TotalIncome));

  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted">
            Income by Source
          </p>
          <h2 className="mt-1 text-xl font-black text-text">
            Your income distribution
          </h2>
          <p className="mt-1 text-sm text-muted">
            See which accounts contribute most to your total income.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="rounded-xl border border-border bg-bg px-3 py-2 text-xs font-bold text-text">
            By source
          </button>
          <button className="rounded-xl border border-border bg-bg px-3 py-2 text-xs font-bold text-text">
            Total amounts
          </button>
        </div>
      </div>

      {sortedData.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border bg-bg/50">
          <p className="text-sm text-muted">No income sources to show.</p>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="relative h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #E5E7EB",
                    borderRadius: "10px",
                    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.08)"
                  }}
                />
                <Pie
                  data={sortedData}
                  dataKey="TotalIncome"
                  nameKey="AccountName"
                  innerRadius="62%"
                  outerRadius="88%"
                  paddingAngle={1}
                  stroke="none"
                >
                  {sortedData.map((entry, index) => (
                    <Cell
                      key={`${entry.AccountName}-${index}`}
                      fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="font-mono text-xl font-black text-text">
                {formatCurrency(total)}
              </p>
              <p className="mt-1 text-xs font-semibold text-muted">Total</p>
            </div>
          </div>

          <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
            {sortedData.map((row, index) => {
              const percent = total > 0 ? (Number(row.TotalIncome) / total) * 100 : 0;

              return (
                <div key={row.AccountName} className="flex items-start gap-3">
                  <span
                    className="mt-1 h-3 w-3 shrink-0 rounded-full"
                    style={{
                      backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length]
                    }}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-text">
                      {row.AccountName}
                    </p>
                    <p className="mt-1 font-mono text-sm font-semibold text-text">
                      {formatCurrency(row.TotalIncome)}
                      <span className="ml-1 font-sans text-xs text-muted">
                        ({formatPercent(percent)})
                      </span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function SpendingByCategoryCard({ data }: { data: CategorySpendingPoint[] }) {
  const total = data.reduce((sum, row) => sum + Number(row.TotalSpent || 0), 0);
  const sortedData = [...data].sort((a, b) => Number(b.TotalSpent) - Number(a.TotalSpent));

  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted">
            Spending by Category
          </p>
          <h2 className="mt-1 text-xl font-black text-text">
            Your category breakdown
          </h2>
          <p className="mt-1 text-sm text-muted">
            See where your money went, grouped by spending category.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="rounded-xl border border-border bg-bg px-3 py-2 text-xs font-bold text-text">
            By category
          </button>
          <button className="rounded-xl border border-border bg-bg px-3 py-2 text-xs font-bold text-text">
            Total amounts
          </button>
        </div>
      </div>

      {sortedData.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border bg-bg/50">
          <p className="text-sm text-muted">No spending categories to show.</p>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="relative h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    border: "1px solid #E5E7EB",
                    borderRadius: "10px",
                    boxShadow: "0 8px 20px rgba(15, 23, 42, 0.08)"
                  }}
                />
                <Pie
                  data={sortedData}
                  dataKey="TotalSpent"
                  nameKey="CategoryName"
                  innerRadius="62%"
                  outerRadius="88%"
                  paddingAngle={1}
                  stroke="none"
                >
                  {sortedData.map((entry, index) => (
                    <Cell
                      key={entry.CategoryID}
                      fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="font-mono text-xl font-black text-text">
                {formatCurrency(total)}
              </p>
              <p className="mt-1 text-xs font-semibold text-muted">Total</p>
            </div>
          </div>

          <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
            {sortedData.map((row, index) => {
              const percent = total > 0 ? (Number(row.TotalSpent) / total) * 100 : 0;

              return (
                <div key={row.CategoryID} className="flex items-start gap-3">
                  <span
                    className="mt-1 h-3 w-3 shrink-0 rounded-full"
                    style={{
                      backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length]
                    }}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-text">
                      {row.CategoryName}
                    </p>
                    <p className="mt-1 font-mono text-sm font-semibold text-text">
                      {formatCurrency(row.TotalSpent)}
                      <span className="ml-1 font-sans text-xs text-muted">
                        ({formatPercent(percent)})
                      </span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { AuthGuard } from "@/components/auth/auth-guard";
import { DataTable } from "@/components/common/data-table";
import { ErrorState } from "@/components/common/error-state";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { CashFlowChart } from "@/components/finance/cash-flow-chart";
import { CategoryDonutChart } from "@/components/finance/category-donut-chart";
import { KpiCard } from "@/components/finance/kpi-card";
import { NetWorthChart } from "@/components/finance/net-worth-chart";
import { AppShell } from "@/components/layout/app-shell";
import {
  extractApiErrorMessage,
  getBalanceHistory,
  getCategorySpending,
  getDashboardOverview,
  getMetaAccounts,
  getTransactions,
  getYearlySummary
} from "@/lib/api-client";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { useAuth } from "@/providers/auth-provider";
import { useUserScope } from "@/providers/user-scope-provider";
import type { SpendingAlert, TransactionRecord } from "@/types/api";

type TransactionWithCategory = TransactionRecord & {
  CategoryName?: string | null;
};

function getAlertTone(level: string): "warning" | "danger" | "default" {
  const normalized = level.toUpperCase();

  if (normalized === "EXCEEDED") {
    return "danger";
  }

  if (normalized === "WARNING") {
    return "warning";
  }

  return "default";
}

function getDisplayName(
  user?: { UserName?: string | null; Email?: string | null } | null
): string {
  const name = user?.UserName?.trim();

  if (name) {
    return name;
  }

  const emailName = user?.Email?.split("@")[0]?.trim();

  if (emailName) {
    return emailName;
  }

  return "User";
}

function getTransactionLabel(row: TransactionWithCategory): string {
  if (row.TransactionType === "INCOME") {
    return "Income";
  }

  return row.CategoryName || "Expense";
}

function getAmountClass(transactionType: string): string {
  return transactionType === "INCOME" ? "text-success" : "text-warning";
}

function getSignedAmount(row: TransactionWithCategory): string {
  const prefix = row.TransactionType === "INCOME" ? "+" : "-";
  return `${prefix}${formatCurrency(row.Amount)}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isAdmin } = useAuth();
  const { selectedUserId, users } = useUserScope();
  const [cashFlowRange, setCashFlowRange] = useState<"MONTHLY" | "YEARLY">("MONTHLY");

  const scopedUserId = isAdmin ? selectedUserId ?? user?.UserID : user?.UserID;
  const scopedUser =
    isAdmin && scopedUserId
      ? users.find((row) => row.UserID === scopedUserId)
      : user;

  const displayName = getDisplayName(scopedUser);

  const showWelcome = searchParams.get("welcome") === "1";

  useEffect(() => {
    if (!showWelcome) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.delete("welcome");
    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;

    router.replace(nextUrl);
  }, [showWelcome, pathname, router, searchParams]);

  const headerTitle = showWelcome ? `Welcome back, ${displayName}` : "Dashboard";
  const headerSubtitle = showWelcome
    ? undefined
    : "Here is your latest financial overview.";

  const dashboardQuery = useQuery({
    queryKey: ["dashboard-overview", scopedUserId],
    queryFn: () => getDashboardOverview(scopedUserId),
    enabled: Boolean(scopedUserId)
  });

  const categoryQuery = useQuery({
    queryKey: ["dashboard-categories", scopedUserId],
    queryFn: () => getCategorySpending(scopedUserId),
    enabled: Boolean(scopedUserId)
  });

  const historyQuery = useQuery({
    queryKey: ["dashboard-history", scopedUserId],
    queryFn: () => getBalanceHistory({ user_id: scopedUserId }),
    enabled: Boolean(scopedUserId)
  });

  const transactionsQuery = useQuery({
    queryKey: ["dashboard-recent-transactions", scopedUserId],
    queryFn: () => getTransactions({ user_id: scopedUserId }),
    enabled: Boolean(scopedUserId)
  });

  const accountsQuery = useQuery({
    queryKey: ["dashboard-accounts", scopedUserId],
    queryFn: () => getMetaAccounts(scopedUserId),
    enabled: Boolean(scopedUserId)
  });

  const yearlyTrendQuery = useQuery({
    queryKey: ["dashboard-yearly-trend", scopedUserId],
    queryFn: () => getYearlySummary(scopedUserId),
    enabled: Boolean(scopedUserId)
  });

  const recentTransactions = useMemo(() => {
    return [...((transactionsQuery.data || []) as TransactionWithCategory[])]
      .sort(
        (a, b) =>
          new Date(b.TransactionDate).getTime() -
          new Date(a.TransactionDate).getTime()
      )
      .slice(0, 5);
  }, [transactionsQuery.data]);

  const cashFlowChartData = useMemo(() => {
    if (cashFlowRange === "YEARLY") {
      return (yearlyTrendQuery.data || []).map((row) => ({
        YearMonth: String(row.ReportYear),
        MonthlyIncome: row.YearlyIncome,
        MonthlyExpense: row.YearlyExpense,
        NetSaving: row.NetSaving
      }));
    }
    return dashboardQuery.data?.monthly_trend || [];
  }, [cashFlowRange, yearlyTrendQuery.data, dashboardQuery.data]);

  const cashFlowSummaryRows = useMemo(() => {
    return cashFlowChartData.map((row) => ({
      Period: row.YearMonth,
      Income: formatCurrency(row.MonthlyIncome),
      Expense: formatCurrency(row.MonthlyExpense),
      "Net saving": formatCurrency(row.NetSaving)
    }));
  }, [cashFlowChartData]);

  const isLoading =
    dashboardQuery.isLoading ||
    categoryQuery.isLoading ||
    historyQuery.isLoading ||
    yearlyTrendQuery.isLoading;

  const isError =
    dashboardQuery.isError ||
    categoryQuery.isError ||
    historyQuery.isError ||
    yearlyTrendQuery.isError;

  const errorMessage =
    dashboardQuery.error ||
    categoryQuery.error ||
    historyQuery.error ||
    yearlyTrendQuery.error;

  return (
    <AuthGuard>
      <AppShell title={headerTitle} subtitle={headerSubtitle}>
        {isLoading ? <LoadingSkeleton label="Loading dashboard..." /> : null}

        {isError ? (
          <ErrorState
            detail={extractApiErrorMessage(
              errorMessage,
              "Failed to load dashboard data."
            )}
            onRetry={() => {
              dashboardQuery.refetch();
              categoryQuery.refetch();
              historyQuery.refetch();
            }}
            title="Unable to load dashboard"
          />
        ) : null}

        {dashboardQuery.data && categoryQuery.data && historyQuery.data ? (
          <>
            <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label="Total Income"
                value={dashboardQuery.data.summary.TotalIncome}
                tone="success"
              />
              <KpiCard
                label="Total Expense"
                value={dashboardQuery.data.summary.TotalExpense}
                tone="warning"
              />
              <KpiCard
                label="Net Saving"
                value={dashboardQuery.data.summary.NetSaving}
                tone={
                  dashboardQuery.data.summary.NetSaving >= 0 ? "success" : "danger"
                }
              />
              <KpiCard
                label="Active Alerts"
                value={dashboardQuery.data.alerts.length}
                tone={dashboardQuery.data.alerts.length > 0 ? "warning" : "default"}
                format="number"
              />
            </div>

            <div className="mb-6">
              <NetWorthChart data={historyQuery.data} />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <CashFlowChart
                  data={cashFlowChartData}
                  headerActions={
                    <>
                      <button
                        type="button"
                        onClick={() => setCashFlowRange("MONTHLY")}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                          cashFlowRange === "MONTHLY"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-bg text-muted hover:bg-surface-hover hover:text-text"
                        }`}
                      >
                        Monthly
                      </button>
                      <button
                        type="button"
                        onClick={() => setCashFlowRange("YEARLY")}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                          cashFlowRange === "YEARLY"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-bg text-muted hover:bg-surface-hover hover:text-text"
                        }`}
                      >
                        Yearly
                      </button>
                    </>
                  }
                />
              </div>
              <div className="lg:col-span-1">
                <CategoryDonutChart data={categoryQuery.data} />
              </div>
            </div>

            <div className="mt-4">
              <DataTable
                title={`Cash Flow Summary (${cashFlowRange === "MONTHLY" ? "Monthly" : "Yearly"})`}
                rows={cashFlowSummaryRows}
                emptyMessage="No cash flow summary data."
              />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <RecentTransactionsCard
                transactions={recentTransactions}
                accounts={accountsQuery.data || []}
                loading={transactionsQuery.isLoading || accountsQuery.isLoading}
              />
              <SpendingAlertsCard alerts={dashboardQuery.data.alerts} />
            </div>
          </>
        ) : null}
      </AppShell>
    </AuthGuard>
  );
}

function RecentTransactionsCard({
  transactions,
  accounts,
  loading
}: {
  transactions: TransactionWithCategory[];
  accounts: { AccountID: number; BankName: string }[];
  loading: boolean;
}) {
  return (
    <section className="h-full rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-text">
          Recent Transactions
        </h2>
        <p className="text-sm text-muted">Latest 5 account movements</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading recent transactions...</p>
      ) : null}

      {!loading && transactions.length === 0 ? (
        <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-border bg-bg/50">
          <p className="text-sm text-muted">No recent transactions found.</p>
        </div>
      ) : null}

      <div className="grid gap-3">
        {transactions.map((row) => {
          const account = accounts.find((item) => item.AccountID === row.AccountID);
          const label = getTransactionLabel(row);

          return (
            <article
              key={`${row.TransactionType}-${row.TransactionID}`}
              className="flex items-center justify-between gap-4 rounded-xl border border-border bg-bg px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-text">{label}</p>
                <p className="mt-1 truncate text-xs text-muted">
                  {formatDateTime(row.TransactionDate)}
                  {account?.BankName ? ` | ${account.BankName}` : ""}
                  {row.Description ? ` | ${row.Description}` : ""}
                </p>
              </div>

              <p
                className={`shrink-0 font-mono text-sm font-black ${getAmountClass(row.TransactionType)}`}
              >
                {getSignedAmount(row)}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function SpendingAlertsCard({ alerts }: { alerts: SpendingAlert[] }) {
  return (
    <section className="h-full rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="mb-4 flex items-end justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight text-text">
          Spending Alerts
        </h2>
        <p className="text-sm text-muted">Top active alerts</p>
      </div>

      {alerts.length === 0 ? (
        <div className="flex h-32 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-bg/50">
          <p className="text-sm text-muted">All good! No active alerts.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {alerts.slice(0, 5).map((alert) => {
            const tone = getAlertTone(alert.AlertLevel);

            return (
              <li
                key={alert.BudgetID}
                className="flex items-center justify-between rounded-lg border border-border/50 bg-bg px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-text">{alert.CategoryName}</p>
                  <p className="text-xs text-muted">
                    Budget: {alert.BudgetYear}-{String(alert.BudgetMonth).padStart(2, "0")}
                  </p>
                </div>

                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                    tone === "danger"
                      ? "bg-danger/10 text-danger"
                      : tone === "warning"
                        ? "bg-warning/10 text-warning"
                        : "bg-primary/10 text-primary"
                  }`}
                >
                  {alert.AlertLevel}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

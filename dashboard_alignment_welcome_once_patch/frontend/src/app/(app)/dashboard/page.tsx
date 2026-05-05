"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { AuthGuard } from "@/components/auth/auth-guard";
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
  getDashboardOverview
} from "@/lib/api-client";
import { useAuth } from "@/providers/auth-provider";
import { useUserScope } from "@/providers/user-scope-provider";

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

function getDisplayName(user?: { UserName?: string | null; Email?: string | null } | null): string {
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

export default function DashboardPage() {
  const { user, isAdmin, token } = useAuth();
  const { selectedUserId, users } = useUserScope();
  const [showWelcome, setShowWelcome] = useState(false);

  const scopedUserId = isAdmin ? selectedUserId ?? user?.UserID : user?.UserID;
  const scopedUser =
    isAdmin && scopedUserId
      ? users.find((row) => row.UserID === scopedUserId)
      : user;

  const displayName = getDisplayName(scopedUser);

  const welcomeStorageKey = useMemo(() => {
    if (!token || !user?.UserID) {
      return null;
    }

    return `pf_dashboard_welcome_seen_${user.UserID}_${token}`;
  }, [token, user?.UserID]);

  useEffect(() => {
    if (!welcomeStorageKey) {
      setShowWelcome(false);
      return;
    }

    const alreadySeen = sessionStorage.getItem(welcomeStorageKey) === "true";

    if (alreadySeen) {
      setShowWelcome(false);
      return;
    }

    setShowWelcome(true);
    sessionStorage.setItem(welcomeStorageKey, "true");
  }, [welcomeStorageKey]);

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

  const isLoading =
    dashboardQuery.isLoading || categoryQuery.isLoading || historyQuery.isLoading;

  const isError =
    dashboardQuery.isError || categoryQuery.isError || historyQuery.isError;

  const errorMessage =
    dashboardQuery.error || categoryQuery.error || historyQuery.error;

  return (
    <AuthGuard>
      <AppShell
        title="Dashboard"
        subtitle={showWelcome ? `Welcome back, ${displayName}` : undefined}
      >
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
                <CashFlowChart data={dashboardQuery.data.monthly_trend} />
              </div>
              <div className="lg:col-span-1">
                <CategoryDonutChart data={categoryQuery.data} />
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-border bg-surface p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold tracking-tight text-text">
                Spending Alerts
              </h2>

              {dashboardQuery.data.alerts.length === 0 ? (
                <div className="flex h-32 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-bg/50">
                  <p className="text-sm text-muted">All good! No active alerts.</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {dashboardQuery.data.alerts.slice(0, 5).map((alert) => {
                    const tone = getAlertTone(alert.AlertLevel);

                    return (
                      <li
                        key={alert.BudgetID}
                        className="flex items-center justify-between rounded-lg border border-border/50 bg-bg px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-text">
                            {alert.CategoryName}
                          </p>
                          <p className="text-xs text-muted">
                            Budget: {alert.BudgetYear}-
                            {String(alert.BudgetMonth).padStart(2, "0")}
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
            </div>
          </>
        ) : null}
      </AppShell>
    </AuthGuard>
  );
}

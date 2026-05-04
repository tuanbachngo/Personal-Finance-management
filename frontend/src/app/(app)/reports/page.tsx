"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { AuthGuard } from "@/components/auth/auth-guard";
import { DataTable } from "@/components/common/data-table";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { BudgetProgressBars } from "@/components/finance/budget-progress-bars";
import { CategoryDonutChart } from "@/components/finance/category-donut-chart";
import { IncomeDonutChart } from "@/components/finance/income-donut-chart";
import { SankeyCashFlow } from "@/components/finance/sankey-cash-flow";
import { AppShell } from "@/components/layout/app-shell";
import { ChartPanel } from "@/components/finance/chart-panel";
import {
  getBudgetStatus,
  getCategorySpending,
  getDailySummary,
  getMetaAccounts,
  getMonthlySummary,
  getTransactions,
  getYearlySummary
} from "@/lib/api-client";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}
import { useAuth } from "@/providers/auth-provider";
import { useUserScope } from "@/providers/user-scope-provider";

export default function ReportsPage() {
  const currentYear = new Date().getFullYear();
  const { user, isAdmin } = useAuth();
  const { selectedUserId } = useUserScope();
  const userId = isAdmin ? selectedUserId ?? user?.UserID : user?.UserID;

  const [activeTab, setActiveTab] = useState<"cash-flow" | "spending" | "income">("cash-flow");

  const now = new Date();
  const prev = new Date();
  prev.setDate(now.getDate() - 30);
  const [startDate, setStartDate] = useState(toIsoDate(prev));
  const [endDate, setEndDate] = useState(toIsoDate(now));

  const [useBudgetFilter, setUseBudgetFilter] = useState(false);
  const [budgetYear, setBudgetYear] = useState(currentYear);
  const [budgetMonth, setBudgetMonth] = useState(new Date().getMonth() + 1);

  const monthlyQuery = useQuery({ queryKey: ["report-monthly", userId], queryFn: () => getMonthlySummary(userId), enabled: Boolean(userId) });
  const yearlyQuery = useQuery({ queryKey: ["report-yearly", userId], queryFn: () => getYearlySummary(userId), enabled: Boolean(userId) });
  const categoryQuery = useQuery({ queryKey: ["report-category", userId], queryFn: () => getCategorySpending(userId), enabled: Boolean(userId) });
  const dailyQuery = useQuery({ queryKey: ["daily-summary", userId, startDate, endDate], queryFn: () => getDailySummary({ user_id: userId, start_date: startDate, end_date: endDate }), enabled: Boolean(userId) });
  const budgetQuery = useQuery({
    queryKey: ["report-budget-status", userId, useBudgetFilter, budgetYear, budgetMonth],
    queryFn: () =>
      getBudgetStatus({
        user_id: userId,
        budget_year: useBudgetFilter ? budgetYear : null,
        budget_month: useBudgetFilter ? budgetMonth : null
      }),
    enabled: Boolean(userId)
  });
  const transactionsQuery = useQuery({ queryKey: ["transactions", userId], queryFn: () => getTransactions({ user_id: userId }), enabled: Boolean(userId) });
  const accountsQuery = useQuery({ queryKey: ["accounts", userId], queryFn: () => getMetaAccounts(userId), enabled: Boolean(userId) });

  const budgetChartData = useMemo(() => {
    const map = new Map<string, { CategoryName: string; PlannedAmount: number; SpentAmount: number }>();
    for (const row of budgetQuery.data || []) {
      const key = row.CategoryName;
      const prev = map.get(key) || { CategoryName: key, PlannedAmount: 0, SpentAmount: 0 };
      prev.PlannedAmount += row.PlannedAmount;
      prev.SpentAmount += row.SpentAmount;
      map.set(key, prev);
    }
    return Array.from(map.values());
  }, [budgetQuery.data]);

  const sankeyData = useMemo(() => {
    const txs = transactionsQuery.data || [];
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    const filteredTxs = txs.filter(t => {
      const d = new Date(t.TransactionDate);
      return d >= start && d <= end;
    });

    let totalIncome = 0;
    let totalExpense = 0;
    const categoryMap = new Map<string, number>();

    filteredTxs.forEach(t => {
      if (t.TransactionType === "INCOME") {
        totalIncome += Number(t.Amount);
      } else if (t.TransactionType === "EXPENSE") {
        totalExpense += Number(t.Amount);
        const cName = t.CategoryName || `Category ${t.CategoryID}`;
        categoryMap.set(cName, (categoryMap.get(cName) || 0) + Number(t.Amount));
      }
    });

    const savings = Math.max(0, totalIncome - totalExpense);

    const nodes = [
      { name: "Total Income", color: "#06B6D4" }, // Cyan
      { name: "Savings", color: "#10B981" }       // Emerald
    ];
    const links: any[] = [];
    const COLORS = ["#F59E0B", "#EC4899", "#8B5CF6", "#14B8A6", "#F43F5E", "#3B82F6", "#84CC16"];

    if (totalIncome > 0) {
      links.push({ source: 0, target: 1, value: savings });
      
      let idx = 0;
      categoryMap.forEach((spent, cName) => {
        nodes.push({ name: cName, color: COLORS[idx % COLORS.length] });
        links.push({ source: 0, target: idx + 2, value: spent });
        idx++;
      });
    }

    return { nodes, links };
  }, [transactionsQuery.data, startDate, endDate]);

  const incomeData = useMemo(() => {
    const txs = transactionsQuery.data || [];
    const accounts = accountsQuery.data || [];
    const incomeTxs = txs.filter(t => t.TransactionType === "INCOME");
    
    const map = new Map<number, number>();
    incomeTxs.forEach(tx => {
      map.set(tx.AccountID, (map.get(tx.AccountID) || 0) + Number(tx.Amount));
    });

    return Array.from(map.entries()).map(([accountId, total]) => {
      const acc = accounts.find(a => a.AccountID === accountId);
      return { AccountName: acc?.BankName || `Account ${accountId}`, TotalIncome: total };
    });
  }, [transactionsQuery.data, accountsQuery.data]);

  const incomeTransactionsTable = useMemo(() => {
    return (transactionsQuery.data || [])
      .filter(t => t.TransactionType === "INCOME")
      .map(row => {
        const acc = (accountsQuery.data || []).find(a => a.AccountID === row.AccountID);
        return {
          TransactionDate: formatDateTime(row.TransactionDate),
          AccountName: acc?.BankName || `Account ${row.AccountID}`,
          Amount: formatCurrency(row.Amount),
          Description: row.Description || ""
        };
      });
  }, [transactionsQuery.data, accountsQuery.data]);

  return (
    <AuthGuard>
      <AppShell title="Reports" subtitle={`Financial reporting for UserID ${userId ?? "-"}`}>
        {monthlyQuery.isLoading || yearlyQuery.isLoading || categoryQuery.isLoading || budgetQuery.isLoading || transactionsQuery.isLoading ? (
          <LoadingSkeleton label="Loading reports..." />
        ) : null}

        {/* Tab Navigation */}
        <div className="mb-6 flex flex-col gap-4 border-b border-border md:flex-row md:items-end md:justify-between">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("cash-flow")}
              className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
                activeTab === "cash-flow"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted hover:border-border hover:text-text"
              }`}
            >
              Cash Flow
            </button>
            <button
              onClick={() => setActiveTab("spending")}
              className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
                activeTab === "spending"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted hover:border-border hover:text-text"
              }`}
            >
              Spending
            </button>
            <button
              onClick={() => setActiveTab("income")}
              className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
                activeTab === "income"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted hover:border-border hover:text-text"
              }`}
            >
              Income
            </button>
          </nav>

          {activeTab === "cash-flow" && (
            <div className="mb-2 flex items-center space-x-3">
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="focus-ring rounded-md border border-border bg-surface px-3 py-1.5 text-sm" />
              <span className="text-sm text-muted">to</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="focus-ring rounded-md border border-border bg-surface px-3 py-1.5 text-sm" />
            </div>
          )}
        </div>

        <div className="grid gap-6">
          {activeTab === "cash-flow" && (
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
          )}

          {activeTab === "spending" && (
            <>
              <CategoryDonutChart data={categoryQuery.data || []} />
              <DataTable
                title="Category Spending Table"
                rows={(categoryQuery.data || []).map((row) => ({
                  CategoryID: row.CategoryID,
                  CategoryName: row.CategoryName,
                  TotalSpent: formatCurrency(row.TotalSpent),
                  TotalTransactions: row.TotalTransactions
                }))}
                emptyMessage="No category spending data."
              />

              <div className="rounded-xl border border-border bg-bg p-3">
                <label className="mb-2 block text-sm text-muted">
                  <input
                    type="checkbox"
                    checked={useBudgetFilter}
                    onChange={(event) => setUseBudgetFilter(event.target.checked)}
                    className="mr-2"
                  />
                  Filter budget report by year/month
                </label>
                {useBudgetFilter ? (
                  <div className="grid gap-2 md:grid-cols-2">
                    <input
                      type="number"
                      value={budgetYear}
                      min={2000}
                      max={2100}
                      onChange={(event) => setBudgetYear(Number(event.target.value))}
                      className="focus-ring rounded-md border border-border bg-surface px-3 py-2 text-text"
                    />
                    <select
                      value={budgetMonth}
                      onChange={(event) => setBudgetMonth(Number(event.target.value))}
                      className="focus-ring rounded-md border border-border bg-surface px-3 py-2 text-text"
                    >
                      {Array.from({ length: 12 }).map((_, index) => (
                        <option key={index + 1} value={index + 1}>
                          {index + 1}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>

              <BudgetProgressBars
                title="Budget vs Actual"
                data={budgetChartData}
              />
              <DataTable
                title="Budget vs Actual Table"
                rows={(budgetQuery.data || []).map((row) => ({
                  BudgetID: row.BudgetID,
                  CategoryName: row.CategoryName,
                  BudgetPeriod: `${row.BudgetYear}-${String(row.BudgetMonth).padStart(2, "0")}`,
                  PlannedAmount: formatCurrency(row.PlannedAmount),
                  SpentAmount: formatCurrency(row.SpentAmount),
                  RemainingBudget: formatCurrency(row.RemainingBudget),
                  AlertLevel: row.AlertLevel
                }))}
                emptyMessage="No budget-vs-actual data."
              />
            </>
          )}

          {activeTab === "income" && (
            <>
              <IncomeDonutChart data={incomeData} />
              <DataTable
                title="Income Transactions"
                rows={incomeTransactionsTable}
                emptyMessage="No income data found."
              />
              <DataTable
                title="Yearly Summary"
                rows={(yearlyQuery.data || []).map((row) => ({
                  ReportYear: row.ReportYear,
                  YearlyIncome: formatCurrency(row.YearlyIncome),
                  YearlyExpense: formatCurrency(row.YearlyExpense),
                  NetSaving: formatCurrency(row.NetSaving)
                }))}
                emptyMessage="No yearly summary data."
              />
            </>
          )}
        </div>
      </AppShell>
    </AuthGuard>
  );
}


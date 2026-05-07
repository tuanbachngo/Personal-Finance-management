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
  getMetaAccounts,
  getTransactions,
} from "@/lib/api-client";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { useAuth } from "@/providers/auth-provider";
import { useUserScope } from "@/providers/user-scope-provider";
import type { TransactionRecord } from "@/types/api";

type TransactionWithCategory = TransactionRecord & {
  CategoryName?: string | null;
};

type SpendingCategoryPoint = {
  CategoryKey: string;
  CategoryName: string;
  TotalSpent: number;
  TotalTransactions: number;
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

function getMonthKey(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const text = String(value).trim();
  if (text.length >= 7 && /^\d{4}-\d{2}/.test(text)) {
    return text.slice(0, 7);
  }
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  return `${parsed.getFullYear()}-${month}`;
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  return `${month}/${year}`;
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

  return "tài khoản của bạn";
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
  const [selectedMonth, setSelectedMonth] = useState("");

  const now = new Date();
  // Mốc đầu luôn cố định: ngày 1 của tháng hiện tại
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [endDate, setEndDate] = useState(toIsoDate(now));

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

  const monthOptions = useMemo(() => {
    const keys = new Set<string>();
    (transactionsQuery.data || []).forEach((row) => {
      const key = getMonthKey(row.TransactionDate);
      if (key) {
        keys.add(key);
      }
    });
    return Array.from(keys).sort((a, b) => b.localeCompare(a));
  }, [transactionsQuery.data]);

  useEffect(() => {
    if (!selectedMonth && monthOptions.length > 0) {
      setSelectedMonth(monthOptions[0]);
      return;
    }
    if (selectedMonth && monthOptions.length > 0 && !monthOptions.includes(selectedMonth)) {
      setSelectedMonth(monthOptions[0]);
    }
  }, [monthOptions, selectedMonth]);

  // monthStart và currentMonthLabel tự động theo endDate (không cứng theo tháng hiện tại)
  const sankeyMonthStart = useMemo(() => {
    const end = new Date(endDate);
    return new Date(end.getFullYear(), end.getMonth(), 1);
  }, [endDate]);

  const currentMonthLabel = useMemo(() => {
    const end = new Date(endDate);
    return `Tháng ${end.getMonth() + 1}/${end.getFullYear()}`;
  }, [endDate]);

  const sankeyData = useMemo(() => {
    const txs = (transactionsQuery.data || []) as TransactionWithCategory[];
    const accounts = accountsQuery.data || [];

    // Tổng số dư hiện tại của tất cả tài khoản
    const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.Balance || 0), 0);

    // Luôn tính từ ngày 1 của tháng ứng với endDate (auto-derived)
    const start = sankeyMonthStart;
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
        const categoryName = transaction.CategoryName || "Chưa phân loại";
        categoryMap.set(
          categoryName,
          (categoryMap.get(categoryName) || 0) + Number(transaction.Amount)
        );
      }
    });

    const hasIncome = totalIncome > 0;
    const hasExpense = categoryMap.size > 0;

    if (!hasExpense && !hasIncome) {
      return { nodes: [], links: [] };
    }

    /**
     * Luồng dữ liệu:
     *  Trường hợp có income:
     *    Node 0: Tổng số dư → Node 1: Thu nhập → Node 2+: các danh mục chi tiêu
     *    Nếu income > totalExpense: thêm node "Còn lại" nhận phần dư từ Thu nhập
     *
     *  Trường hợp không có income:
     *    Node 0: Tổng số dư → Node 1+: các danh mục chi tiêu trực tiếp
     */
    const nodes: { name: string; color: string; displayValue?: number }[] = [
      { name: "Tổng số dư", color: "#06B6D4", displayValue: totalBalance },
    ];

    const links: { source: number; target: number; value: number }[] = [];

    if (hasIncome) {
      // Node 1: Thu nhập
      nodes.push({ name: `Thu nhập ${currentMonthLabel}`, color: "#10B981" });
      // Tổng số dư → Thu nhập
      links.push({ source: 0, target: 1, value: totalIncome });

      const remainder = totalIncome - totalExpense;
      let expenseStartIndex = 2;

      if (remainder > 0) {
        // Node 2: Còn lại (phần income chưa chi)
        nodes.push({ name: "Còn lại", color: "#8B5CF6" });
        links.push({ source: 1, target: 2, value: remainder });
        expenseStartIndex = 3;
      }

      let idx = 0;
      categoryMap.forEach((spent, categoryName) => {
        nodes.push({
          name: categoryName,
          color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
        });
        // Thu nhập → expense category (capped at min(spent, income) để tránh vượt flow)
        const flowValue = Math.min(spent, totalIncome);
        links.push({ source: 1, target: expenseStartIndex + idx, value: flowValue });
        idx += 1;
      });
    } else {
      // Không có income → Tổng số dư → chi tiêu trực tiếp
      let idx = 0;
      categoryMap.forEach((spent, categoryName) => {
        nodes.push({
          name: categoryName,
          color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
        });
        links.push({ source: 0, target: idx + 1, value: spent });
        idx += 1;
      });
    }

    return { nodes, links };
  }, [transactionsQuery.data, accountsQuery.data, endDate, sankeyMonthStart]);



  const selectedMonthTransactions = useMemo(() => {
    const txs = (transactionsQuery.data || []) as TransactionWithCategory[];
    if (!selectedMonth) {
      return txs;
    }
    return txs.filter((transaction) => getMonthKey(transaction.TransactionDate) === selectedMonth);
  }, [transactionsQuery.data, selectedMonth]);

  const incomeData = useMemo(() => {
    const accounts = accountsQuery.data || [];
    const incomeTxs = selectedMonthTransactions.filter(
      (transaction) => transaction.TransactionType === "INCOME"
    );

    const map = new Map<number, number>();

    incomeTxs.forEach((transaction) => {
      map.set(
        transaction.AccountID,
        (map.get(transaction.AccountID) || 0) + Number(transaction.Amount)
      );
    });

    return Array.from(map.entries())
      .map(([accountId, total]) => {
        const account = accounts.find((item) => item.AccountID === accountId);
        return {
          AccountName: account?.BankName || "Nguồn chưa rõ",
          TotalIncome: total
        };
      })
      .sort((a, b) => Number(b.TotalIncome) - Number(a.TotalIncome));
  }, [selectedMonthTransactions, accountsQuery.data]);

  const spendingData = useMemo(() => {
    const expenses = selectedMonthTransactions.filter(
      (transaction) => transaction.TransactionType === "EXPENSE"
    );
    const map = new Map<string, SpendingCategoryPoint>();

    expenses.forEach((transaction) => {
      const categoryName = transaction.CategoryName || "Chưa phân loại";
      const categoryKey =
        transaction.CategoryID !== null && transaction.CategoryID !== undefined
          ? String(transaction.CategoryID)
          : categoryName.toLowerCase();
      const existing = map.get(categoryKey);
      if (!existing) {
        map.set(categoryKey, {
          CategoryKey: categoryKey,
          CategoryName: categoryName,
          TotalSpent: Number(transaction.Amount),
          TotalTransactions: 1
        });
        return;
      }
      existing.TotalSpent += Number(transaction.Amount);
      existing.TotalTransactions += 1;
    });

    return Array.from(map.values()).sort((a, b) => b.TotalSpent - a.TotalSpent);
  }, [selectedMonthTransactions]);

  const incomeTotal = useMemo(() => {
    return incomeData.reduce((sum, row) => sum + Number(row.TotalIncome || 0), 0);
  }, [incomeData]);

  const incomeSourceRows = useMemo(() => {
    return incomeData.map((row) => ({
      "Nguồn thu": row.AccountName,
      "Tổng thu nhập": formatCurrency(row.TotalIncome),
      "Tỷ trọng": incomeTotal > 0 ? formatPercent((row.TotalIncome / incomeTotal) * 100) : "0.0%"
    }));
  }, [incomeData, incomeTotal]);

  const incomeTransactionsTable = useMemo(() => {
    return selectedMonthTransactions
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
          "Ngày": formatDateTime(row.TransactionDate),
          "Nguồn thu": account?.BankName || "Nguồn chưa rõ",
          "Số tiền": formatCurrency(row.Amount),
          "Ghi chú": row.Description || ""
        };
      });
  }, [selectedMonthTransactions, accountsQuery.data]);

  const categorySummaryRows = useMemo(() => {
    const total = spendingData.reduce((sum, row) => sum + Number(row.TotalSpent || 0), 0);
    return spendingData.map((row) => ({
      "Danh mục": row.CategoryName,
      "Tổng chi": formatCurrency(row.TotalSpent),
      "Tỷ trọng": total > 0 ? formatPercent((Number(row.TotalSpent) / total) * 100) : "0.0%",
      "Số giao dịch": row.TotalTransactions
    }));
  }, [spendingData]);

  const spendingTransactionsRows = useMemo(() => {
    return selectedMonthTransactions
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
          "Ngày": formatDateTime(row.TransactionDate),
          "Tài khoản": row.BankName || account?.BankName || "Tài khoản chưa rõ",
          "Danh mục": row.CategoryName || "Chưa phân loại",
          "Số tiền": formatCurrency(row.Amount),
          "Mô tả": row.Description || ""
        };
      });
  }, [selectedMonthTransactions, accountsQuery.data]);

  const selectedMonthLabel = selectedMonth ? formatMonthLabel(selectedMonth) : "Tháng gần nhất";

  const cashFlowLoading = transactionsQuery.isLoading || accountsQuery.isLoading;
  const spendingLoading = transactionsQuery.isLoading || accountsQuery.isLoading;
  const incomeLoading = transactionsQuery.isLoading || accountsQuery.isLoading;

  const cashFlowError = transactionsQuery.error || accountsQuery.error;
  const spendingError = transactionsQuery.error || accountsQuery.error;
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
        title="Báo cáo"
        subtitle={`Góc nhìn tài chính rõ ràng cho ${displayName}`}
      >
        {activeLoading ? <LoadingSkeleton label="Đang tải báo cáo..." /> : null}

        {activeError ? (
          <ErrorState
            title="Không thể tải dữ liệu báo cáo"
            detail={extractApiErrorMessage(
              activeError,
              "Không thể tải dữ liệu báo cáo."
            )}
            onRetry={() => {
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
              Dòng tiền
            </TabButton>
            <TabButton
              active={activeTab === "spending"}
              onClick={() => setActiveTab("spending")}
            >
              Chi tiêu
            </TabButton>
            <TabButton
              active={activeTab === "income"}
              onClick={() => setActiveTab("income")}
            >
              Thu nhập
            </TabButton>
          </nav>

          {activeTab === "cash-flow" ? (
            <div className="mb-2 flex items-center gap-2">
              <span className="text-sm text-muted">
                Từ đầu {currentMonthLabel} đến
              </span>
              <input
                type="date"
                value={endDate}
                max={toIsoDate(now)}
                onChange={(event) => setEndDate(event.target.value)}
                className="focus-ring rounded-md border border-border bg-surface px-3 py-1.5 text-sm"
              />
            </div>
          ) : null}

          {activeTab !== "cash-flow" ? (
            <div className="mb-2 flex items-center gap-2">
              <label className="text-sm font-semibold text-muted">Tháng</label>
              <select
                className="focus-ring rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-text"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                disabled={monthOptions.length === 0}
              >
                {monthOptions.length === 0 ? (
                  <option value="">Chưa có tháng giao dịch</option>
                ) : null}
                {monthOptions.map((monthKey) => (
                  <option key={monthKey} value={monthKey}>
                    {formatMonthLabel(monthKey)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        <div className="grid gap-6">
          {activeTab === "cash-flow" && !activeError ? (
            <SankeyCashFlow data={sankeyData} />
          ) : null}

          {activeTab === "spending" && !activeError ? (
            <>
              <SpendingByCategoryCard
                data={spendingData}
                monthLabel={selectedMonthLabel}
              />
              <DataTable
                title={`Tổng hợp - ${selectedMonthLabel}`}
                rows={categorySummaryRows}
                emptyMessage="Không có dữ liệu chi tiêu."
              />
              <DataTable
                title={`Giao dịch chi tiêu - ${selectedMonthLabel}`}
                rows={spendingTransactionsRows}
                emptyMessage="Không có giao dịch chi tiêu."
              />
            </>
          ) : null}

          {activeTab === "income" && !activeError ? (
            <>
              <IncomeBySourceCard data={incomeData} monthLabel={selectedMonthLabel} />
              <DataTable
                title={`Tổng hợp - ${selectedMonthLabel}`}
                rows={incomeSourceRows}
                emptyMessage="Không có dữ liệu nguồn thu nhập."
              />
              <DataTable
                title={`Giao dịch thu nhập - ${selectedMonthLabel}`}
                rows={incomeTransactionsTable}
                emptyMessage="Không có giao dịch thu nhập."
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
  data,
  monthLabel
}: {
  data: { AccountName: string; TotalIncome: number }[];
  monthLabel: string;
}) {
  const total = data.reduce((sum, row) => sum + Number(row.TotalIncome || 0), 0);
  const sortedData = [...data].sort((a, b) => Number(b.TotalIncome) - Number(a.TotalIncome));

  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted">
            Thu nhập theo nguồn
          </p>
          <h2 className="mt-1 text-xl font-black text-text">
            Phân bổ nguồn thu nhập
          </h2>
          <p className="mt-1 text-sm text-muted">
            Xem từng nguồn đã đóng góp thu nhập trong {monthLabel}.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="rounded-xl border border-border bg-bg px-3 py-2 text-xs font-bold text-text">
            Theo nguồn
          </button>
          <button className="rounded-xl border border-border bg-bg px-3 py-2 text-xs font-bold text-text">
            Tổng số tiền
          </button>
        </div>
      </div>

      {sortedData.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border bg-bg/50">
          <p className="text-sm text-muted">Không có nguồn thu nhập để hiển thị.</p>
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
              <p className="mt-1 text-xs font-semibold text-muted">Tổng</p>
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

function SpendingByCategoryCard({
  data,
  monthLabel
}: {
  data: SpendingCategoryPoint[];
  monthLabel: string;
}) {
  const total = data.reduce((sum, row) => sum + Number(row.TotalSpent || 0), 0);
  const sortedData = [...data].sort((a, b) => Number(b.TotalSpent) - Number(a.TotalSpent));

  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted">
            Chi tiêu theo danh mục
          </p>
          <h2 className="mt-1 text-xl font-black text-text">
            Phân rã chi tiêu theo danh mục
          </h2>
          <p className="mt-1 text-sm text-muted">
            Xem tiền đã đi vào đâu trong {monthLabel}, nhóm theo từng danh mục.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className="rounded-xl border border-border bg-bg px-3 py-2 text-xs font-bold text-text">
            Theo danh mục
          </button>
          <button className="rounded-xl border border-border bg-bg px-3 py-2 text-xs font-bold text-text">
            Tổng số tiền
          </button>
        </div>
      </div>

      {sortedData.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border bg-bg/50">
          <p className="text-sm text-muted">Không có danh mục chi tiêu để hiển thị.</p>
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
                      key={entry.CategoryKey}
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
              <p className="mt-1 text-xs font-semibold text-muted">Tổng</p>
            </div>
          </div>

          <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
            {sortedData.map((row, index) => {
              const percent = total > 0 ? (Number(row.TotalSpent) / total) * 100 : 0;

              return (
                <div key={row.CategoryKey} className="flex items-start gap-3">
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

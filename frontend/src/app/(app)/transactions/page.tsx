"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { AuthGuard } from "@/components/auth/auth-guard";
import { ErrorState } from "@/components/common/error-state";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { TransactionModal } from "@/components/finance/transaction-modal";
import { AppShell } from "@/components/layout/app-shell";
import {
  extractApiErrorMessage,
  getMetaAccounts,
  getMetaCategories,
  getTransactions
} from "@/lib/api-client";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { useAuth } from "@/providers/auth-provider";
import { useUserScope } from "@/providers/user-scope-provider";
import type { TransactionRecord } from "@/types/api";

type TransactionTab = "INCOME" | "EXPENSE";

const tabs: { label: string; value: TransactionTab }[] = [
  { label: "Income", value: "INCOME" },
  { label: "Expense", value: "EXPENSE" }
];

function getTransactionKey(row: TransactionRecord): string {
  return `${row.TransactionType}-${row.TransactionID}`;
}

export default function TransactionsPage() {
  const { user, isAdmin } = useAuth();
  const { selectedUserId } = useUserScope();
  const userId = isAdmin ? selectedUserId ?? user?.UserID : user?.UserID;

  const [activeTab, setActiveTab] = useState<TransactionTab>("INCOME");
  const [accountId, setAccountId] = useState<number | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editQueue, setEditQueue] = useState<TransactionRecord[]>([]);

  const accountsQuery = useQuery({
    queryKey: ["accounts", userId],
    queryFn: () => getMetaAccounts(userId),
    enabled: Boolean(userId)
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: getMetaCategories
  });

  const transactionsQuery = useQuery({
    queryKey: ["transactions", userId, accountId],
    queryFn: () => getTransactions({ user_id: userId, account_id: accountId }),
    enabled: Boolean(userId)
  });

  const accountById = useMemo(() => {
    const map = new Map<number, string>();

    (accountsQuery.data || []).forEach((row) => {
      map.set(row.AccountID, row.BankName || `Account #${row.AccountID}`);
    });

    return map;
  }, [accountsQuery.data]);

  const categoryById = useMemo(() => {
    const map = new Map<number, string>();

    (categoriesQuery.data || []).forEach((row) => {
      map.set(row.CategoryID, row.CategoryName || `Category #${row.CategoryID}`);
    });

    return map;
  }, [categoriesQuery.data]);

  const visibleTransactions = useMemo(() => {
    return (transactionsQuery.data || []).filter(
      (row) => String(row.TransactionType).toUpperCase() === activeTab
    );
  }, [transactionsQuery.data, activeTab]);

  const handleSelectionChange = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((item) => item !== id)
    );
  };

  const startEditQueue = () => {
    const selectedTransactions = visibleTransactions.filter((row) =>
      selectedIds.includes(getTransactionKey(row))
    );

    if (selectedTransactions.length > 0) {
      setEditQueue(selectedTransactions);
    }
  };

  const handleModalSuccess = () => {
    transactionsQuery.refetch();

    if (isAddModalOpen) {
      setIsAddModalOpen(false);
      return;
    }

    if (editQueue.length > 0) {
      const newQueue = [...editQueue];
      newQueue.shift();
      setEditQueue(newQueue);

      if (newQueue.length === 0) {
        setIsEditMode(false);
        setSelectedIds([]);
      }
    }
  };

  const handleModalClose = () => {
    setIsAddModalOpen(false);
    setEditQueue([]);
    setIsEditMode(false);
    setSelectedIds([]);
  };

  const handleTabChange = (tab: TransactionTab) => {
    setActiveTab(tab);
    setSelectedIds([]);
    setIsEditMode(false);
    setEditQueue([]);
  };

  const currentEditTransaction = editQueue.length > 0 ? editQueue[0] : null;
  const emptyMessage =
    activeTab === "INCOME" ? "No income records found." : "No expense records found.";

  return (
    <AuthGuard>
      <AppShell
        title="Transactions"
        subtitle={`Browse and manage transactions for ${user?.UserName || `UserID ${userId ?? "-"}`}`}
      >
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex w-full flex-col gap-3 md:flex-row md:items-center">
            <div className="flex rounded-xl border border-border bg-bg p-1">
              {tabs.map((tab) => {
                const active = activeTab === tab.value;

                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => handleTabChange(tab.value)}
                    className={`focus-ring rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
                      active
                        ? "bg-primary text-bg"
                        : "text-muted hover:bg-surface-hover hover:text-text"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="w-full md:max-w-xs">
              <select
                className="focus-ring w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text"
                value={accountId ?? ""}
                onChange={(event) => {
                  const raw = event.target.value;
                  setAccountId(raw ? Number(raw) : null);
                  setSelectedIds([]);
                }}
              >
                <option value="">All accounts</option>
                {(accountsQuery.data || []).map((row) => (
                  <option key={row.AccountID} value={row.AccountID}>
                    {row.BankName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
            {isEditMode ? (
              <button
                type="button"
                onClick={() => {
                  setIsEditMode(false);
                  setSelectedIds([]);
                }}
                className="focus-ring rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-text transition-colors hover:bg-surface-hover"
              >
                Cancel Edit
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditMode(true)}
                  className="focus-ring rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-text transition-colors hover:bg-surface-hover"
                >
                  Select & Edit
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="focus-ring rounded-xl bg-primary px-4 py-2 text-sm font-bold text-bg transition-colors hover:bg-primary/90"
                >
                  + Add Transaction
                </button>
              </>
            )}
          </div>
        </div>

        {transactionsQuery.isLoading ? (
          <LoadingSkeleton label="Loading transactions..." />
        ) : null}

        {transactionsQuery.isError ? (
          <ErrorState
            title="Failed to load transactions"
            detail={extractApiErrorMessage(transactionsQuery.error)}
            onRetry={() => transactionsQuery.refetch()}
          />
        ) : null}

        {transactionsQuery.data ? (
          <div className="relative pb-24">
            <div className="rounded-2xl border border-border bg-bg p-3">
              {visibleTransactions.length === 0 ? (
                <p className="p-3 text-sm text-muted">{emptyMessage}</p>
              ) : (
                <div className="overflow-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr>
                        {isEditMode ? (
                          <th className="w-10 border-b border-border px-3 py-3 text-left font-medium text-muted" />
                        ) : null}
                        <th className="border-b border-border px-3 py-3 text-left font-medium text-muted">
                          Date
                        </th>
                        <th className="border-b border-border px-3 py-3 text-left font-medium text-muted">
                          Account
                        </th>
                        {activeTab === "EXPENSE" ? (
                          <th className="border-b border-border px-3 py-3 text-left font-medium text-muted">
                            Category
                          </th>
                        ) : null}
                        <th className="border-b border-border px-3 py-3 text-right font-medium text-muted">
                          Amount
                        </th>
                        <th className="border-b border-border px-3 py-3 text-left font-medium text-muted">
                          Description
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {visibleTransactions.map((row) => {
                        const rowId = getTransactionKey(row);
                        const selected = selectedIds.includes(rowId);
                        const accountName =
                          accountById.get(row.AccountID) || `Account #${row.AccountID}`;
                        const categoryName =
                          row.CategoryID === null
                            ? "-"
                            : categoryById.get(row.CategoryID) ||
                              `Category #${row.CategoryID}`;

                        return (
                          <tr
                            key={rowId}
                            className={`transition-colors hover:bg-surface-hover ${
                              selected ? "bg-primary/5" : ""
                            }`}
                          >
                            {isEditMode ? (
                              <td className="border-b border-border px-3 py-3 text-text">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                                  checked={selected}
                                  onChange={(event) =>
                                    handleSelectionChange(rowId, event.target.checked)
                                  }
                                  aria-label={`Select transaction ${rowId}`}
                                />
                              </td>
                            ) : null}

                            <td className="border-b border-border px-3 py-3 text-text">
                              {formatDateTime(row.TransactionDate)}
                            </td>

                            <td className="border-b border-border px-3 py-3 text-text">
                              {accountName}
                            </td>

                            {activeTab === "EXPENSE" ? (
                              <td className="border-b border-border px-3 py-3 text-text">
                                {categoryName}
                              </td>
                            ) : null}

                            <td
                              className={`border-b border-border px-3 py-3 text-right font-mono font-bold ${
                                activeTab === "INCOME" ? "text-success" : "text-danger"
                              }`}
                            >
                              {formatCurrency(row.Amount)}
                            </td>

                            <td className="max-w-sm truncate border-b border-border px-3 py-3 text-muted">
                              {row.Description || "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {isEditMode ? (
              <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 rounded-full border border-border bg-surface px-6 py-3 shadow-lg">
                <span className="text-sm font-semibold text-text">
                  {selectedIds.length} transaction{selectedIds.length !== 1 ? "s" : ""}{" "}
                  selected
                </span>
                <button
                  type="button"
                  onClick={startEditQueue}
                  disabled={selectedIds.length === 0}
                  className="rounded-full bg-primary px-6 py-2 text-sm font-bold text-bg transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Edit Selected
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        <TransactionModal
          isOpen={isAddModalOpen || editQueue.length > 0}
          mode={editQueue.length > 0 ? "EDIT" : "ADD"}
          transaction={currentEditTransaction}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
        />
      </AppShell>
    </AuthGuard>
  );
}

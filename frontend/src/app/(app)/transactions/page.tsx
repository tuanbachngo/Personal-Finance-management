"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { AuthGuard } from "@/components/auth/auth-guard";
import { DataTable } from "@/components/common/data-table";
import { ErrorState } from "@/components/common/error-state";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { TransactionModal } from "@/components/finance/transaction-modal";
import { AppShell } from "@/components/layout/app-shell";
import { extractApiErrorMessage, getMetaAccounts, getTransactions } from "@/lib/api-client";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { useAuth } from "@/providers/auth-provider";
import { useUserScope } from "@/providers/user-scope-provider";
import type { TransactionRecord } from "@/types/api";

export default function TransactionsPage() {
  const { user, isAdmin } = useAuth();
  const { selectedUserId } = useUserScope();
  const userId = isAdmin ? selectedUserId ?? user?.UserID : user?.UserID;
  
  const [accountId, setAccountId] = useState<number | null>(null);

  // Modal and Edit State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editQueue, setEditQueue] = useState<TransactionRecord[]>([]);

  const accountsQuery = useQuery({
    queryKey: ["accounts", userId],
    queryFn: () => getMetaAccounts(userId),
    enabled: Boolean(userId)
  });

  const transactionsQuery = useQuery({
    queryKey: ["transactions", userId, accountId],
    queryFn: () => getTransactions({ user_id: userId, account_id: accountId }),
    enabled: Boolean(userId)
  });

  const handleSelectionChange = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((item) => item !== id)
    );
  };

  const startEditQueue = () => {
    if (!transactionsQuery.data) return;
    const selectedTransactions = transactionsQuery.data.filter(t => 
      selectedIds.includes(`${t.TransactionType}-${t.TransactionID}`)
    );
    if (selectedTransactions.length > 0) {
      setEditQueue(selectedTransactions);
    }
  };

  const handleModalSuccess = () => {
    transactionsQuery.refetch();
    
    if (isAddModalOpen) {
      setIsAddModalOpen(false);
    } else if (editQueue.length > 0) {
      // Pop the first element off the queue
      const newQueue = [...editQueue];
      newQueue.shift();
      setEditQueue(newQueue);
      
      // If the queue is now empty, we exit edit mode and clear selection
      if (newQueue.length === 0) {
        setIsEditMode(false);
        setSelectedIds([]);
      }
    }
  };

  const handleModalClose = () => {
    setIsAddModalOpen(false);
    setEditQueue([]); // Cancel remaining edits if closed mid-way
    setIsEditMode(false);
    setSelectedIds([]);
  };

  const tableRows =
    transactionsQuery.data?.map((row) => ({
      UniqueKey: `${row.TransactionType}-${row.TransactionID}`,
      TransactionType: row.TransactionType,
      TransactionID: row.TransactionID,
      AccountID: row.AccountID,
      CategoryID: row.CategoryID ?? "",
      Amount: formatCurrency(row.Amount),
      TransactionDate: formatDateTime(row.TransactionDate),
      Description: row.Description || ""
    })) || [];

  const currentEditTransaction = editQueue.length > 0 ? editQueue[0] : null;

  return (
    <AuthGuard>
      <AppShell title="Transactions" subtitle={`Browse and manage transactions for UserID ${userId ?? "-"}`}>
        <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="w-full md:max-w-xs">
            <select
              className="focus-ring w-full rounded-md border border-border bg-surface px-3 py-2 text-text shadow-sm"
              value={accountId ?? ""}
              onChange={(event) => {
                const raw = event.target.value;
                setAccountId(raw ? Number(raw) : null);
              }}
            >
              <option value="">All accounts</option>
              {(accountsQuery.data || []).map((row) => (
                <option key={row.AccountID} value={row.AccountID}>
                  AccountID {row.AccountID} - {row.BankName}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex w-full items-center gap-3 md:w-auto">
            {isEditMode ? (
              <button
                onClick={() => {
                  setIsEditMode(false);
                  setSelectedIds([]);
                }}
                className="focus-ring rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold text-text shadow-sm hover:bg-surface-hover transition-colors w-full md:w-auto"
              >
                Cancel Edit
              </button>
            ) : (
              <>
                <button
                  onClick={() => setIsEditMode(true)}
                  className="focus-ring rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold text-text shadow-sm hover:bg-surface-hover transition-colors w-full md:w-auto"
                >
                  Select & Edit
                </button>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="focus-ring rounded-md bg-primary px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-primary/90 transition-colors w-full md:w-auto"
                >
                  + Add Transaction
                </button>
              </>
            )}
          </div>
        </div>

        {transactionsQuery.isLoading ? <LoadingSkeleton label="Loading transactions..." /> : null}
        
        {transactionsQuery.isError ? (
          <ErrorState
            title="Failed to load transactions"
            detail={extractApiErrorMessage(transactionsQuery.error)}
            onRetry={() => transactionsQuery.refetch()}
          />
        ) : null}
        
        {transactionsQuery.data ? (
          <div className="relative pb-24">
            <DataTable 
              rows={tableRows} 
              emptyMessage="No transactions found for this user." 
              selectable={isEditMode}
              selectedIds={selectedIds}
              onSelectionChange={handleSelectionChange}
              idKey="UniqueKey"
            />

            {/* Floating Action Bar for Edit Mode */}
            {isEditMode && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 rounded-full border border-border bg-surface px-6 py-3 shadow-lg">
                <span className="text-sm font-semibold text-text">
                  {selectedIds.length} transaction{selectedIds.length !== 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={startEditQueue}
                  disabled={selectedIds.length === 0}
                  className="rounded-full bg-primary px-6 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Edit Selected
                </button>
              </div>
            )}
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


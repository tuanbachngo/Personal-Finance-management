"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { AuthGuard } from "@/components/auth/auth-guard";
import { DataTable } from "@/components/common/data-table";
import { AppShell } from "@/components/layout/app-shell";
import { getBalanceHistory, getMetaAccounts } from "@/lib/api-client";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { useAuth } from "@/providers/auth-provider";
import { useUserScope } from "@/providers/user-scope-provider";

export default function BalanceHistoryPage() {
  const { user, isAdmin } = useAuth();
  const { selectedUserId } = useUserScope();
  const userId = isAdmin ? selectedUserId ?? user?.UserID : user?.UserID;
  const [accountId, setAccountId] = useState<number | null>(null);

  const accountsQuery = useQuery({
    queryKey: ["accounts", userId],
    queryFn: () => getMetaAccounts(userId),
    enabled: Boolean(userId)
  });

  const historyQuery = useQuery({
    queryKey: ["balance-history", userId, accountId],
    queryFn: () => getBalanceHistory({ user_id: userId, account_id: accountId }),
    enabled: Boolean(userId)
  });

  return (
    <AuthGuard>
      <AppShell title="Balance History" subtitle={`Running balance timeline for UserID ${userId ?? "-"}`}>
        <div className="rounded-lg border border-border bg-bg p-3">
          <label className="mb-1 block text-sm text-muted">Filter by account</label>
          <select
            value={accountId ?? ""}
            onChange={(event) => setAccountId(event.target.value ? Number(event.target.value) : null)}
            className="focus-ring w-full rounded-md border border-border bg-surface px-3 py-2 text-text"
          >
            <option value="">All accounts</option>
            {(accountsQuery.data || []).map((row) => (
              <option key={row.AccountID} value={row.AccountID}>
                AccountID {row.AccountID} - {row.BankName}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4">
          <DataTable
            title="Balance History Timeline"
            rows={(historyQuery.data || []).map((row) => ({
              AccountID: row.AccountID,
              BankName: row.BankName,
              TransactionDate: formatDateTime(row.TransactionDate),
              TransactionType: row.TransactionType,
              ReferenceID: row.ReferenceID,
              AmountSigned: formatCurrency(row.AmountSigned),
              RunningBalance: formatCurrency(row.RunningBalance)
            }))}
            emptyMessage="No balance history found for this user."
          />
        </div>
      </AppShell>
    </AuthGuard>
  );
}


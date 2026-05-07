"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { AuthGuard } from "@/components/auth/auth-guard";
import { DataTable } from "@/components/common/data-table";
import { AppShell } from "@/components/layout/app-shell";
import { getBalanceHistory, getMetaAccounts } from "@/lib/api-client";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { useAuth } from "@/providers/auth-provider";
import { useUserScope } from "@/providers/user-scope-provider";

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

function friendlyTransactionType(type: string): string {
  const normalized = type.toUpperCase();

  if (normalized === "INCOME") {
    return "Tiền vào";
  }

  if (normalized === "EXPENSE") {
    return "Tiền ra";
  }

  return type;
}

export default function BalanceHistoryPage() {
  const { user, isAdmin } = useAuth();
  const { selectedUserId, users } = useUserScope();

  const userId = isAdmin ? selectedUserId ?? user?.UserID : user?.UserID;
  const scopedUser =
    isAdmin && userId
      ? users.find((row) => row.UserID === userId)
      : user;

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

  const tableRows = useMemo(() => {
    return (historyQuery.data || []).map((row) => ({
      Date: formatDateTime(row.TransactionDate),
      Account: row.BankName,
      Type: friendlyTransactionType(row.TransactionType),
      Amount: formatCurrency(row.AmountSigned),
      "Running balance": formatCurrency(row.RunningBalance)
    }));
  }, [historyQuery.data]);

  return (
    <AuthGuard>
      <AppShell
        title="Lịch sử số dư"
        subtitle={`Theo dõi biến động số dư theo thời gian của ${getDisplayName(scopedUser)}`}
      >
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <label className="mb-2 block text-sm font-semibold text-muted">
            Lọc theo tài khoản
          </label>
          <select
            value={accountId ?? ""}
            onChange={(event) =>
              setAccountId(event.target.value ? Number(event.target.value) : null)
            }
            className="focus-ring w-full rounded-xl border border-border bg-bg px-3 py-2 text-text"
          >
            <option value="">Tất cả tài khoản</option>
            {(accountsQuery.data || []).map((row) => (
              <option key={row.AccountID} value={row.AccountID}>
                {row.BankName}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4">
          <DataTable
            title="Dòng thời gian số dư"
            rows={tableRows}
            emptyMessage="Không có dữ liệu lịch sử số dư."
          />
        </div>
      </AppShell>
    </AuthGuard>
  );
}

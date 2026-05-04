"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import {
  createExpense,
  createIncome,
  extractApiErrorMessage,
  getMetaAccounts,
  getMetaCategories,
  updateExpense,
  updateIncome
} from "@/lib/api-client";
import { useAuth } from "@/providers/auth-provider";
import { useUserScope } from "@/providers/user-scope-provider";
import type { TransactionRecord } from "@/types/api";

type Props = {
  isOpen: boolean;
  mode: "ADD" | "EDIT";
  transaction?: TransactionRecord | null;
  onClose: () => void;
  onSuccess: () => void;
};

export function TransactionModal({ isOpen, mode, transaction, onClose, onSuccess }: Props) {
  const { user, isAdmin } = useAuth();
  const { selectedUserId } = useUserScope();
  const userId = isAdmin ? selectedUserId ?? user?.UserID : user?.UserID;

  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [accountId, setAccountId] = useState(0);
  const [categoryId, setCategoryId] = useState(0);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const accountsQuery = useQuery({
    queryKey: ["accounts", userId],
    queryFn: () => getMetaAccounts(userId),
    enabled: Boolean(userId) && isOpen
  });

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: getMetaCategories,
    enabled: isOpen
  });

  const createIncomeMutation = useMutation({ mutationFn: createIncome });
  const updateIncomeMutation = useMutation({
    mutationFn: (data: { id: number; payload: any }) => updateIncome(data.id, data.payload)
  });
  const createExpenseMutation = useMutation({ mutationFn: createExpense });
  const updateExpenseMutation = useMutation({
    mutationFn: (data: { id: number; payload: any }) => updateExpense(data.id, data.payload)
  });

  const isPending =
    createIncomeMutation.isPending ||
    updateIncomeMutation.isPending ||
    createExpenseMutation.isPending ||
    updateExpenseMutation.isPending;

  useEffect(() => {
    if (isOpen) {
      if (mode === "EDIT" && transaction) {
        setType(transaction.TransactionType as "INCOME" | "EXPENSE");
        setAccountId(transaction.AccountID);
        setCategoryId(transaction.CategoryID || 0);
        // Format amount with commas
        const strAmount = String(transaction.Amount);
        const parts = strAmount.split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        setAmount(parts.join("."));
        setDescription(transaction.Description || "");
      } else {
        // Reset form for ADD
        setType("EXPENSE");
        setAccountId(0);
        setCategoryId(0);
        setAmount("");
        setDescription("");
      }
    }
  }, [isOpen, mode, transaction]);

  if (!isOpen) return null;

  const submit = async () => {
    if (!userId) return alert("Missing user scope.");
    if (!accountId) return alert("Please select account.");
    if (type === "EXPENSE" && !categoryId) return alert("Please select category.");
    
    const parsedAmount = Number(amount.replace(/,/g, ""));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return alert("Amount must be greater than 0.");
    }

    try {
      if (mode === "ADD") {
        if (type === "INCOME") {
          await createIncomeMutation.mutateAsync({
            user_id: userId,
            account_id: accountId,
            amount: parsedAmount,
            description
          });
        } else {
          await createExpenseMutation.mutateAsync({
            user_id: userId,
            account_id: accountId,
            category_id: categoryId,
            amount: parsedAmount,
            description
          });
        }
      } else if (mode === "EDIT" && transaction) {
        if (type === "INCOME") {
          await updateIncomeMutation.mutateAsync({
            id: transaction.TransactionID,
            payload: {
              user_id: userId,
              account_id: accountId,
              amount: parsedAmount,
              description
            }
          });
        } else {
          await updateExpenseMutation.mutateAsync({
            id: transaction.TransactionID,
            payload: {
              user_id: userId,
              account_id: accountId,
              category_id: categoryId,
              amount: parsedAmount,
              description
            }
          });
        }
      }
      onSuccess();
    } catch (error) {
      alert(extractApiErrorMessage(error, "Failed to save transaction."));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-lg">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-text">
            {mode === "ADD" ? "Add Transaction" : "Edit Transaction"}
          </h2>
          <button onClick={onClose} className="text-muted hover:text-text">&times; Close</button>
        </div>

        {mode === "ADD" && (
          <div className="mb-4 flex rounded-lg bg-bg p-1">
            <button
              type="button"
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                type === "EXPENSE" ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text"
              }`}
              onClick={() => setType("EXPENSE")}
            >
              Expense
            </button>
            <button
              type="button"
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                type === "INCOME" ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text"
              }`}
              onClick={() => setType("INCOME")}
            >
              Income
            </button>
          </div>
        )}

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-text">Account</span>
            <select
              value={accountId}
              onChange={(e) => setAccountId(Number(e.target.value))}
              className="focus-ring w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
            >
              <option value={0}>Select account</option>
              {(accountsQuery.data || []).map((row) => (
                <option key={row.AccountID} value={row.AccountID}>
                  AccountID {row.AccountID} - {row.BankName}
                </option>
              ))}
            </select>
          </label>

          {type === "EXPENSE" && (
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-text">Category</span>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(Number(e.target.value))}
                className="focus-ring w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
              >
                <option value={0}>Select category</option>
                {(categoriesQuery.data || []).map((row) => (
                  <option key={row.CategoryID} value={row.CategoryID}>
                    CategoryID {row.CategoryID} - {row.CategoryName}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-text">Amount</span>
            <input
              value={amount}
              onChange={(e) => {
                let rawValue = e.target.value.replace(/[^0-9.]/g, "");
                const parts = rawValue.split(".");
                if (parts.length > 2) {
                  rawValue = parts[0] + "." + parts.slice(1).join("");
                }
                const finalParts = rawValue.split(".");
                finalParts[0] = finalParts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                setAmount(finalParts.join("."));
              }}
              type="text"
              className="focus-ring w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
              placeholder="0.00"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-text">Description (Optional)</span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="focus-ring w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
              placeholder="E.g., Groceries or Salary"
            />
          </label>

          <div className="mt-6 flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={isPending}
              className="focus-ring rounded-md bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary/90"
            >
              {isPending ? "Saving..." : "Save Transaction"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

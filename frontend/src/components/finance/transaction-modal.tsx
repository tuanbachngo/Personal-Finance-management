"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import {
  canISpend,
  createExpense,
  createIncome,
  deleteExpense,
  deleteIncome,
  extractApiErrorMessage,
  getMetaAccounts,
  getMetaCategories,
  updateExpense,
  updateIncome
} from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";
import { useAuth } from "@/providers/auth-provider";
import { useUserScope } from "@/providers/user-scope-provider";
import type { CategoryInfo, TransactionRecord } from "@/types/api";

type Props = {
  isOpen: boolean;
  mode: "ADD" | "EDIT";
  transaction?: TransactionRecord | null;
  existingTransactions: TransactionRecord[];
  onClose: () => void;
  onSuccess: () => void;
};

type SuggestionGroup = "food" | "transport" | "shopping" | "utilities" | "health";

const KEYWORD_GROUPS: { keywords: string[]; group: SuggestionGroup }[] = [
  {
    keywords: ["coffee", "highlands", "starbucks", "kfc", "restaurant", "food", "an", "cafe"],
    group: "food"
  },
  {
    keywords: ["grab", "taxi", "bus", "be", "xanh sm", "transport"],
    group: "transport"
  },
  {
    keywords: ["shopee", "lazada", "tiki", "mall", "shopping"],
    group: "shopping"
  },
  {
    keywords: ["electric", "water", "internet", "wifi", "dien", "nuoc"],
    group: "utilities"
  },
  {
    keywords: ["hospital", "pharmacy", "medicine", "medical", "benh vien", "thuoc"],
    group: "health"
  }
];

const CATEGORY_GROUP_HINTS: Record<SuggestionGroup, string[]> = {
  food: ["food", "dining", "eat", "meal", "restaurant", "cafe", "coffee"],
  transport: ["transport", "travel", "taxi", "bus", "ride"],
  shopping: ["shopping", "shop", "mall", "retail"],
  utilities: ["utilities", "utility", "electric", "water", "internet", "wifi"],
  health: ["health", "healthcare", "medical", "hospital", "pharmacy"]
};

function normalizeText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function formatAmountInput(rawValue: string): string {
  let raw = rawValue.replace(/[^0-9.]/g, "");
  const parts = raw.split(".");
  if (parts.length > 2) {
    raw = `${parts[0]}.${parts.slice(1).join("")}`;
  }
  const normalizedParts = raw.split(".");
  normalizedParts[0] = normalizedParts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return normalizedParts.join(".");
}

function toInputDate(value?: string | null): string {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function findSuggestedCategoryId(
  description: string,
  categories: CategoryInfo[]
): number | null {
  const normalizedDescription = normalizeText(description);
  if (!normalizedDescription) {
    return null;
  }

  const matchedGroup = KEYWORD_GROUPS.find((rule) =>
    rule.keywords.some((keyword) => normalizedDescription.includes(keyword))
  )?.group;
  if (!matchedGroup) {
    return null;
  }

  const hints = CATEGORY_GROUP_HINTS[matchedGroup];
  const category = categories.find((row) => {
    const normalizedName = normalizeText(row.CategoryName);
    return hints.some((hint) => normalizedName.includes(hint));
  });
  return category ? category.CategoryID : null;
}

export function TransactionModal({
  isOpen,
  mode,
  transaction,
  existingTransactions,
  onClose,
  onSuccess
}: Props) {
  const { user, isAdmin } = useAuth();
  const { selectedUserId } = useUserScope();
  const userId = isAdmin ? selectedUserId ?? user?.UserID : user?.UserID;

  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [accountId, setAccountId] = useState(0);
  const [categoryId, setCategoryId] = useState(0);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [transactionDate, setTransactionDate] = useState("");
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
  const deleteIncomeMutation = useMutation({ mutationFn: deleteIncome });
  const deleteExpenseMutation = useMutation({ mutationFn: deleteExpense });

  const isPending =
    createIncomeMutation.isPending ||
    updateIncomeMutation.isPending ||
    createExpenseMutation.isPending ||
    updateExpenseMutation.isPending ||
    deleteIncomeMutation.isPending ||
    deleteExpenseMutation.isPending;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSubmitError(null);
    setCategoryTouched(false);
    if (mode === "EDIT" && transaction) {
      setType(transaction.TransactionType as "INCOME" | "EXPENSE");
      setAccountId(transaction.AccountID);
      setCategoryId(transaction.CategoryID || 0);
      setAmount(formatAmountInput(String(transaction.Amount)));
      setDescription(transaction.Description || "");
      setTransactionDate(toInputDate(transaction.TransactionDate));
      return;
    }

    setType("EXPENSE");
    setAccountId(0);
    setCategoryId(0);
    setAmount("");
    setDescription("");
    setTransactionDate(toInputDate(new Date().toISOString()));
  }, [isOpen, mode, transaction]);

  const suggestedCategoryId = useMemo(() => {
    if (type !== "EXPENSE") {
      return null;
    }
    return findSuggestedCategoryId(description, categoriesQuery.data || []);
  }, [type, description, categoriesQuery.data]);

  const suggestedCategoryName = useMemo(() => {
    if (!suggestedCategoryId) {
      return null;
    }
    const row = (categoriesQuery.data || []).find((item) => item.CategoryID === suggestedCategoryId);
    return row?.CategoryName || null;
  }, [categoriesQuery.data, suggestedCategoryId]);

  useEffect(() => {
    if (type !== "EXPENSE" || categoryTouched || !suggestedCategoryId) {
      return;
    }
    setCategoryId(suggestedCategoryId);
  }, [type, categoryTouched, suggestedCategoryId]);

  const duplicateMatches = useMemo(() => {
    if (!transactionDate || !accountId) {
      return [];
    }
    const parsedAmount = Number(amount.replace(/,/g, ""));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return [];
    }

    const normalizedDescription = normalizeText(description);
    return existingTransactions.filter((row) => {
      const rowType = String(row.TransactionType).toUpperCase();
      if (rowType !== type) {
        return false;
      }
      if (row.AccountID !== accountId) {
        return false;
      }
      const rowDate = toInputDate(row.TransactionDate);
      if (rowDate !== transactionDate) {
        return false;
      }
      if (Math.abs(Number(row.Amount) - parsedAmount) > 0.01) {
        return false;
      }
      const rowDesc = normalizeText(row.Description || "");
      if (!normalizedDescription || !rowDesc) {
        return normalizedDescription === rowDesc;
      }
      return (
        rowDesc === normalizedDescription ||
        rowDesc.includes(normalizedDescription) ||
        normalizedDescription.includes(rowDesc)
      );
    }).filter((row) => {
      if (mode !== "EDIT" || !transaction) {
        return true;
      }
      return !(
        row.TransactionID === transaction.TransactionID &&
        String(row.TransactionType).toUpperCase() ===
          String(transaction.TransactionType).toUpperCase()
      );
    });
  }, [transactionDate, accountId, amount, description, existingTransactions, mode, transaction, type]);

  if (!isOpen) {
    return null;
  }

  const submit = async () => {
    if (!userId) {
      setSubmitError("Missing user scope.");
      return;
    }
    if (!accountId) {
      setSubmitError("Please select an account.");
      return;
    }
    if (!transactionDate) {
      setSubmitError("Please select transaction date.");
      return;
    }
    if (type === "EXPENSE" && !categoryId) {
      setSubmitError("Please select category for expense.");
      return;
    }

    const parsedAmount = Number(amount.replace(/,/g, ""));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setSubmitError("Amount must be greater than 0.");
      return;
    }

    setSubmitError(null);
    try {
      let finalDescription = description;
      if (type === "EXPENSE") {
        const [yearRaw, monthRaw] = transactionDate.split("-");
        const budgetYear = Number(yearRaw);
        const budgetMonth = Number(monthRaw);
        const canSpendResult = await canISpend({
          user_id: userId,
          category_id: categoryId,
          amount: parsedAmount,
          budget_year: Number.isFinite(budgetYear) ? budgetYear : new Date().getFullYear(),
          budget_month: Number.isFinite(budgetMonth) ? budgetMonth : new Date().getMonth() + 1,
        });

        if (canSpendResult.requires_confirmation) {
          const continueAnyway = window.confirm(
            `${canSpendResult.decision}\n${canSpendResult.message}\n\nRemaining before: ${formatCurrency(canSpendResult.remaining_before)}\nRemaining after: ${formatCurrency(canSpendResult.remaining_after)}\n\nContinue anyway?`
          );
          if (!continueAnyway) {
            return;
          }
          const reason = window.prompt("Optional: Why do you want to continue this expense?", "");
          if (reason && reason.trim()) {
            finalDescription = finalDescription
              ? `${finalDescription} | Overspending reason: ${reason.trim()}`
              : `Overspending reason: ${reason.trim()}`;
          }
        }
      }

      if (mode === "ADD") {
        if (type === "INCOME") {
          await createIncomeMutation.mutateAsync({
            user_id: userId,
            account_id: accountId,
            amount: parsedAmount,
            transaction_date: transactionDate,
            description: finalDescription
          });
        } else {
          await createExpenseMutation.mutateAsync({
            user_id: userId,
            account_id: accountId,
            category_id: categoryId,
            amount: parsedAmount,
            transaction_date: transactionDate,
            description: finalDescription
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
              transaction_date: transactionDate,
              description: finalDescription
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
              transaction_date: transactionDate,
              description: finalDescription
            }
          });
        }
      }
      onSuccess();
    } catch (error) {
      setSubmitError(extractApiErrorMessage(error, "Failed to save transaction."));
    }
  };

  const removeTransaction = async () => {
    if (mode !== "EDIT" || !transaction) {
      return;
    }

    const confirmed = window.confirm("Delete this transaction?");
    if (!confirmed) {
      return;
    }

    setSubmitError(null);
    try {
      const originalType = String(transaction.TransactionType).toUpperCase();
      if (originalType === "INCOME") {
        await deleteIncomeMutation.mutateAsync(transaction.TransactionID);
      } else {
        await deleteExpenseMutation.mutateAsync(transaction.TransactionID);
      }
      onSuccess();
    } catch (error) {
      setSubmitError(extractApiErrorMessage(error, "Failed to delete transaction."));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-lg">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-text">
            {mode === "ADD" ? "Add Transaction" : "Edit Transaction"}
          </h2>
          <button onClick={onClose} className="text-muted transition-colors hover:text-text">
            &times; Close
          </button>
        </div>

        {mode === "ADD" ? (
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
        ) : null}

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-text">Account</span>
            <select
              value={accountId}
              onChange={(event) => setAccountId(Number(event.target.value))}
              className="focus-ring w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
            >
              <option value={0}>Select account</option>
              {(accountsQuery.data || []).map((row) => (
                <option key={row.AccountID} value={row.AccountID}>
                  {row.BankCode} - {row.BankName}
                </option>
              ))}
            </select>
          </label>

          {type === "EXPENSE" ? (
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-text">Category</span>
              <select
                value={categoryId}
                onChange={(event) => {
                  setCategoryTouched(true);
                  setCategoryId(Number(event.target.value));
                }}
                className="focus-ring w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
              >
                <option value={0}>Select category</option>
                {(categoriesQuery.data || []).map((row) => (
                  <option key={row.CategoryID} value={row.CategoryID}>
                    {row.CategoryName}
                  </option>
                ))}
              </select>
              {suggestedCategoryName ? (
                <p className="mt-2 text-xs text-muted">
                  Suggested category: <span className="font-semibold text-primary">{suggestedCategoryName}</span>
                </p>
              ) : null}
            </label>
          ) : null}

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-text">Amount</span>
            <input
              value={amount}
              onChange={(event) => setAmount(formatAmountInput(event.target.value))}
              type="text"
              className="focus-ring w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
              placeholder="0.00"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-text">Date</span>
            <input
              value={transactionDate}
              onChange={(event) => setTransactionDate(event.target.value)}
              type="date"
              className="focus-ring w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-text">Description / Note (optional)</span>
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="focus-ring w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
              placeholder="E.g., Groceries or Salary"
            />
          </label>

          {duplicateMatches.length > 0 ? (
            <div className="rounded-xl border border-primary/40 bg-primary/10 p-3 text-sm text-primary">
              Potential duplicate detected: {duplicateMatches.length} similar transaction
              {duplicateMatches.length > 1 ? "s" : ""}. You can still save if this is intentional.
            </div>
          ) : null}

          {submitError ? (
            <div className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
              {submitError}
            </div>
          ) : null}

          <div className="mt-6 flex justify-end gap-3 pt-2">
            {mode === "EDIT" ? (
              <button
                onClick={removeTransaction}
                disabled={isPending}
                className="rounded-md border border-danger/40 px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Delete
              </button>
            ) : null}
            <button
              onClick={onClose}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={isPending}
              className="focus-ring rounded-md bg-primary px-4 py-2 text-sm font-bold text-bg transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Saving..." : "Save Transaction"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

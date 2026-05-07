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
  getGoalProgress,
  getMetaAccounts,
  getMetaCategories,
  updateExpense,
  updateIncome
} from "@/lib/api-client";
import { getCategoryIcon } from "@/lib/category-icon";
import { formatCurrency } from "@/lib/format";
import { useAuth } from "@/providers/auth-provider";
import { useUserScope } from "@/providers/user-scope-provider";
import type { CategoryInfo, GoalProgressRecord, TransactionRecord } from "@/types/api";

type Props = {
  isOpen: boolean;
  mode: "ADD" | "EDIT";
  transaction?: TransactionRecord | null;
  existingTransactions: TransactionRecord[];
  onClose: () => void;
  onSuccess: () => void;
};

type SuggestionGroup = "food" | "transport" | "shopping" | "utilities" | "health";
type GoalBucket = "SAVE_UP" | "PAY_DOWN";

const SPECIAL_CATEGORY_SAVE_UP = "__GOAL_SAVE_UP__";
const SPECIAL_CATEGORY_PAY_DOWN = "__GOAL_PAY_DOWN__";

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

function findCategoryIdByHints(
  categories: CategoryInfo[],
  hints: string[]
): number | null {
  const match = categories.find((row) => {
    const normalizedName = normalizeText(row.CategoryName || "");
    return hints.some((hint) => normalizedName.includes(hint));
  });
  return match ? match.CategoryID : null;
}

function resolveGoalBucketCategoryId(
  categories: CategoryInfo[],
  bucket: GoalBucket
): number {
  if (bucket === "SAVE_UP") {
    return (
      findCategoryIdByHints(categories, ["tich luy", "tiet kiem", "tietkiem", "save up", "save"]) || 0
    );
  }
  return (
    findCategoryIdByHints(categories, ["tra no", "trano", "no va tra gop", "tra gop", "debt", "loan"]) || 0
  );
}

function resolveExpenseCategoryFromSelection(
  selection: string,
  categories: CategoryInfo[]
): number {
  if (!selection || selection === "0") {
    return 0;
  }
  if (selection === SPECIAL_CATEGORY_SAVE_UP) {
    return resolveGoalBucketCategoryId(categories, "SAVE_UP");
  }
  if (selection === SPECIAL_CATEGORY_PAY_DOWN) {
    return resolveGoalBucketCategoryId(categories, "PAY_DOWN");
  }

  const parsed = Number(selection);
  return Number.isFinite(parsed) ? parsed : 0;
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
  const [categorySelection, setCategorySelection] = useState("0");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [transactionDate, setTransactionDate] = useState("");
  const [goalId, setGoalId] = useState(0);
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
  const goalsQuery = useQuery({
    queryKey: ["goals-progress", userId],
    queryFn: () => getGoalProgress(userId),
    enabled: Boolean(userId) && isOpen
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
      setCategorySelection(String(transaction.CategoryID || 0));
      setAmount(formatAmountInput(String(transaction.Amount)));
      setDescription(transaction.Description || "");
      setTransactionDate(toInputDate(transaction.TransactionDate));
      setGoalId(transaction.GoalID || 0);
      if (
        String(transaction.TransactionType || "").toUpperCase() === "EXPENSE" &&
        Number(transaction.GoalID || 0) > 0
      ) {
        const normalizedGoalType = String(transaction.GoalType || "").toUpperCase();
        if (normalizedGoalType === "PAY_DOWN") {
          setCategorySelection(SPECIAL_CATEGORY_PAY_DOWN);
        } else {
          setCategorySelection(SPECIAL_CATEGORY_SAVE_UP);
        }
      }
      return;
    }

    setType("EXPENSE");
    setAccountId(0);
    setCategoryId(0);
    setCategorySelection("0");
    setAmount("");
    setDescription("");
    setTransactionDate(toInputDate(new Date().toISOString()));
    setGoalId(0);
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

  const groupedGoals = useMemo(() => {
    const allGoals = (goalsQuery.data || []).filter((goal) => {
      const normalizedStatus = String(goal.Status || "").toUpperCase();
      if (normalizedStatus === "ACTIVE") {
        return true;
      }
      return goal.GoalID === goalId;
    });

    const saveUpGoals: GoalProgressRecord[] = [];
    const payDownGoals: GoalProgressRecord[] = [];

    allGoals.forEach((goal) => {
      if (String(goal.GoalType || "").toUpperCase() === "PAY_DOWN") {
        payDownGoals.push(goal);
      } else {
        saveUpGoals.push(goal);
      }
    });

    return { saveUpGoals, payDownGoals };
  }, [goalsQuery.data, goalId]);

  const selectedGoal = useMemo(() => {
    if (!goalId) {
      return null;
    }
    return (goalsQuery.data || []).find((goal) => goal.GoalID === goalId) || null;
  }, [goalsQuery.data, goalId]);

  const selectedGoalBucket = useMemo<GoalBucket | null>(() => {
    if (categorySelection === SPECIAL_CATEGORY_SAVE_UP) {
      return "SAVE_UP";
    }
    if (categorySelection === SPECIAL_CATEGORY_PAY_DOWN) {
      return "PAY_DOWN";
    }
    return null;
  }, [categorySelection]);

  const goalModeOptions = useMemo(() => {
    if (selectedGoalBucket === "SAVE_UP") {
      return groupedGoals.saveUpGoals;
    }
    if (selectedGoalBucket === "PAY_DOWN") {
      return groupedGoals.payDownGoals;
    }
    return [];
  }, [selectedGoalBucket, groupedGoals]);

  useEffect(() => {
    if (type !== "EXPENSE" || categoryTouched || !suggestedCategoryId) {
      return;
    }
    setCategoryId(suggestedCategoryId);
    setCategorySelection(String(suggestedCategoryId));
  }, [type, categoryTouched, suggestedCategoryId]);

  useEffect(() => {
    if (type !== "EXPENSE") {
      setGoalId(0);
      return;
    }

    const categories = categoriesQuery.data || [];
    const resolvedCategoryId = resolveExpenseCategoryFromSelection(
      categorySelection,
      categories
    );
    setCategoryId(resolvedCategoryId);

    if (!selectedGoalBucket) {
      setGoalId(0);
    }
  }, [type, categorySelection, selectedGoalBucket, categoriesQuery.data]);

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
      setSubmitError("Thiếu phạm vi người dùng.");
      return;
    }
    if (!accountId) {
      setSubmitError("Vui lòng chọn tài khoản.");
      return;
    }
    if (!transactionDate) {
      setSubmitError("Vui lòng chọn ngày giao dịch.");
      return;
    }
    if (type === "EXPENSE" && selectedGoalBucket && !categoryId) {
      setSubmitError("Thiếu danh mục hệ thống cho Trả nợ/Tích lũy. Vui lòng cập nhật danh mục rồi thử lại.");
      return;
    }
    if (type === "EXPENSE" && !categoryId) {
      setSubmitError("Vui lòng chọn danh mục cho khoản chi.");
      return;
    }

    if (type === "EXPENSE" && selectedGoalBucket && !goalId) {
      setSubmitError("Vui lòng chọn mục tiêu cụ thể.");
      return;
    }

    const parsedAmount = Number(amount.replace(/,/g, ""));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setSubmitError("Số tiền phải lớn hơn 0.");
      return;
    }

    setSubmitError(null);
    try {
      let finalDescription = description;
      if (type === "EXPENSE" && !selectedGoalBucket) {
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
            `${canSpendResult.decision}\n${canSpendResult.message}\n\nCòn lại trước khi chi: ${formatCurrency(canSpendResult.remaining_before)}\nCòn lại sau khi chi: ${formatCurrency(canSpendResult.remaining_after)}\n\nBạn vẫn muốn tiếp tục?`
          );
          if (!continueAnyway) {
            return;
          }
          const reason = window.prompt("Tùy chọn: Lý do bạn vẫn muốn tiếp tục khoản chi này?", "");
          if (reason && reason.trim()) {
            finalDescription = finalDescription
              ? `${finalDescription} | Lý do vượt ngân sách: ${reason.trim()}`
              : `Lý do vượt ngân sách: ${reason.trim()}`;
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
            description: finalDescription,
            goal_id: null
          });
        } else {
          await createExpenseMutation.mutateAsync({
            user_id: userId,
            account_id: accountId,
            category_id: categoryId,
            amount: parsedAmount,
            transaction_date: transactionDate,
            description: finalDescription,
            goal_id: goalId || null
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
              description: finalDescription,
              goal_id: null
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
              description: finalDescription,
              goal_id: goalId || null
            }
          });
        }
      }
      onSuccess();
    } catch (error) {
      setSubmitError(extractApiErrorMessage(error, "Không thể lưu giao dịch."));
    }
  };

  const removeTransaction = async () => {
    if (mode !== "EDIT" || !transaction) {
      return;
    }

    const confirmed = window.confirm("Bạn có chắc muốn xóa giao dịch này?");
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
      setSubmitError(extractApiErrorMessage(error, "Không thể xóa giao dịch."));
    }
  };

  const handleTypeSwitch = (nextType: "INCOME" | "EXPENSE") => {
    setType(nextType);
    if (nextType === "INCOME") {
      setGoalId(0);
      setCategoryId(0);
      setCategorySelection("0");
      return;
    }
    if (!categorySelection) {
      setCategorySelection("0");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-lg">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-text">
            {mode === "ADD" ? "Thêm giao dịch" : "Sửa giao dịch"}
          </h2>
          <button onClick={onClose} className="text-muted transition-colors hover:text-text">
            &times; Đóng
          </button>
        </div>

        {mode === "ADD" ? (
          <div className="mb-4 flex rounded-lg bg-bg p-1">
            <button
              type="button"
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                type === "EXPENSE" ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text"
              }`}
              onClick={() => handleTypeSwitch("EXPENSE")}
            >
              Chi tiêu
            </button>
            <button
              type="button"
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                type === "INCOME" ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text"
              }`}
              onClick={() => handleTypeSwitch("INCOME")}
            >
              Thu nhập
            </button>
          </div>
        ) : null}

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-text">Tài khoản</span>
            <select
              value={accountId}
              onChange={(event) => setAccountId(Number(event.target.value))}
              className="focus-ring w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
            >
              <option value={0}>Chọn tài khoản</option>
              {(accountsQuery.data || []).map((row) => (
                <option key={row.AccountID} value={row.AccountID}>
                  {row.BankCode} - {row.BankName}
                </option>
              ))}
            </select>
          </label>

          {type === "EXPENSE" ? (
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-text">Danh mục</span>
              <select
                value={categorySelection}
                onChange={(event) => {
                  setCategoryTouched(true);
                  setCategorySelection(event.target.value);
                }}
                className="focus-ring w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
              >
                <option value="0">Chọn danh mục</option>
                <optgroup label="Mục tiêu">
                  <option value={SPECIAL_CATEGORY_SAVE_UP}>Tích lũy</option>
                  <option value={SPECIAL_CATEGORY_PAY_DOWN}>Trả nợ</option>
                </optgroup>
                {(categoriesQuery.data || []).map((row) => (
                  <option key={row.CategoryID} value={String(row.CategoryID)}>
                    {getCategoryIcon(row.IconEmoji, row.CategoryName)} {row.CategoryName}
                  </option>
                ))}
              </select>
              {selectedGoalBucket ? (
                <p className="mt-2 text-xs text-muted">
                  Chọn mục tiêu bạn muốn ghi nhận đóng góp ở phần bên dưới.
                </p>
              ) : suggestedCategoryName ? (
                <p className="mt-2 text-xs text-muted">
                  Gợi ý danh mục: <span className="font-semibold text-primary">{suggestedCategoryName}</span>
                </p>
              ) : null}
            </label>
          ) : null}

          {type === "EXPENSE" && selectedGoalBucket ? (
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-text">
                {selectedGoalBucket === "SAVE_UP" ? "Khoản mục tích lũy" : "Khoản mục trả nợ"}
              </span>
              <select
                value={goalId}
                onChange={(event) => setGoalId(Number(event.target.value))}
                className="focus-ring w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
              >
                <option value={0}>Chọn mục tiêu</option>
                {goalModeOptions.map((goal) => (
                  <option key={`goal-${goal.GoalID}`} value={goal.GoalID}>
                    {goal.GoalName}
                  </option>
                ))}
              </select>
              {selectedGoal ? (
                <p className="mt-2 text-xs text-muted">
                  {selectedGoalBucket === "PAY_DOWN"
                    ? "Khoản chi này sẽ được ghi nhận vào tiến độ trả nợ."
                    : "Khoản chi này sẽ được ghi nhận vào tiến độ tích lũy."}
                </p>
              ) : null}
            </label>
          ) : null}

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-text">Số tiền</span>
            <input
              value={amount}
              onChange={(event) => setAmount(formatAmountInput(event.target.value))}
              type="text"
              className="focus-ring w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
              placeholder="0.00"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-text">Ngày</span>
            <input
              value={transactionDate}
              onChange={(event) => setTransactionDate(event.target.value)}
              type="date"
              className="focus-ring w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-text">Mô tả / Ghi chú (tùy chọn)</span>
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="focus-ring w-full rounded-md border border-border bg-bg px-3 py-2 text-text"
              placeholder="Ví dụ: Đi chợ hoặc Lương tháng"
            />
          </label>

          {duplicateMatches.length > 0 ? (
            <div className="rounded-xl border border-primary/40 bg-primary/10 p-3 text-sm text-primary">
              Phát hiện {duplicateMatches.length} giao dịch có khả năng trùng lặp.
              Bạn vẫn có thể lưu nếu chắc chắn đây là giao dịch mới.
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
                Xóa
              </button>
            ) : null}
            <button
              onClick={onClose}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text hover:bg-surface-hover"
            >
              Hủy
            </button>
            <button
              onClick={submit}
              disabled={isPending}
              className="focus-ring rounded-md bg-primary px-4 py-2 text-sm font-bold text-bg transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Đang lưu..." : "Lưu giao dịch"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

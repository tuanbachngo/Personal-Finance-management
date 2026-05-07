"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MessageCircle,
  Plus,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AuthGuard } from "@/components/auth/auth-guard";
import { ErrorState } from "@/components/common/error-state";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { BudgetItemCard } from "@/components/finance/budget-item-card";
import { AppShell } from "@/components/layout/app-shell";
import { useReminderVisibility } from "@/hooks/use-reminder-visibility";
import {
  canISpend,
  createBudgetPlan,
  getDashboardReminders,
  deleteBudgetPlan,
  extractApiErrorMessage,
  getBudgetOverview,
  getBudgetSettings,
  getMetaCategories,
  updateBudgetPlan,
  upsertBudgetSettings,
} from "@/lib/api-client";
import { getCategoryIcon } from "@/lib/category-icon";
import { formatCurrency } from "@/lib/format";
import { useAuth } from "@/providers/auth-provider";
import { useUserScope } from "@/providers/user-scope-provider";
import type { BudgetCategoryGuardrail, FixedExpenseItem } from "@/types/api";

type BudgetModalMode = "ADD" | "EDIT";

type BudgetFormState = {
  categoryId: number;
  plannedAmount: string;
  warningPercent: string;
  isSoftLocked: number;
  budgetPriority: "LOW" | "MEDIUM" | "HIGH";
  notes: string;
};

type FixedExpenseDraft = {
  id: string;
  item_name: string;
  category_id: number;
  amount: string;
};

type SettingsFormState = {
  expectedIncome: string;
  goalContributionTarget: string;
  emergencyBuffer: string;
  fixedExpenseItems: FixedExpenseDraft[];
};

const defaultBudgetForm: BudgetFormState = {
  categoryId: 0,
  plannedAmount: "",
  warningPercent: "80",
  isSoftLocked: 0,
  budgetPriority: "MEDIUM",
  notes: "",
};

const defaultSettingsForm: SettingsFormState = {
  expectedIncome: "0",
  goalContributionTarget: "0",
  emergencyBuffer: "0",
  fixedExpenseItems: [],
};

function sanitizeDigits(value: string): string {
  return (value || "").replace(/\D/g, "");
}

function formatWithCommas(value: string): string {
  const digits = sanitizeDigits(value);
  if (!digits) {
    return "";
  }
  return Number(digits).toLocaleString("en-US");
}

function parseInteger(value: string): number {
  const digits = sanitizeDigits(value);
  if (!digits) {
    return 0;
  }
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toFormattedInteger(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "0";
  }
  const normalized = Math.max(0, Math.round(Number(value)));
  return normalized.toLocaleString("en-US");
}

function healthBadgeClass(health: string): string {
  const normalized = String(health || "").toUpperCase();
  if (normalized === "HEALTHY") {
    return "border-success/40 bg-success/10 text-success";
  }
  if (normalized === "CAUTION") {
    return "border-warning/40 bg-warning/10 text-warning";
  }
  if (normalized === "RISKY") {
    return "border-danger/50 bg-danger/10 text-danger";
  }
  return "border-danger bg-danger/15 text-danger";
}

function paceBadgeClass(status: string): string {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "ON_TRACK") {
    return "border-success/40 bg-success/10 text-success";
  }
  if (normalized === "WATCH") {
    return "border-warning/40 bg-warning/10 text-warning";
  }
  if (normalized === "OVER_PACE") {
    return "border-danger/40 bg-danger/10 text-danger";
  }
  return "border-danger bg-danger/15 text-danger";
}

function budgetHealthLabel(value: string): string {
  const normalized = String(value || "").toUpperCase();
  if (normalized === "HEALTHY") {
    return "ỔN ĐỊNH";
  }
  if (normalized === "CAUTION") {
    return "CẦN LƯU Ý";
  }
  if (normalized === "RISKY") {
    return "RỦI RO";
  }
  if (normalized === "OVERPLANNED") {
    return "VƯỢT KẾ HOẠCH";
  }
  return normalized || "KHÁC";
}

function paceStatusLabel(value: string): string {
  const normalized = String(value || "").toUpperCase();
  if (normalized === "ON_TRACK") {
    return "ĐÚNG TIẾN ĐỘ";
  }
  if (normalized === "WATCH") {
    return "THEO DÕI";
  }
  if (normalized === "OVER_PACE") {
    return "VƯỢT NHỊP";
  }
  if (normalized === "EXCEEDED") {
    return "VƯỢT MỨC";
  }
  return normalized || "KHÁC";
}

function decisionLabel(value: string): string {
  const normalized = String(value || "").toUpperCase();
  if (normalized === "SAFE") {
    return "AN TOÀN";
  }
  if (normalized === "CAUTION") {
    return "CẦN LƯU Ý";
  }
  if (normalized === "EXCEEDS_BUDGET") {
    return "VƯỢT NGÂN SÁCH";
  }
  if (normalized === "SOFT_LOCKED") {
    return "ĐANG KHÓA MỀM";
  }
  return normalized || "KHÁC";
}

function progressPercent(planned: number, spent: number): number {
  if (planned <= 0) {
    return 0;
  }
  return Math.max(0, Math.min((spent / planned) * 100, 100));
}

function alertLevelTone(alertLevel: string): "default" | "warning" | "danger" {
  const normalized = String(alertLevel || "").toUpperCase();
  if (normalized === "EXCEEDED") {
    return "danger";
  }
  if (normalized === "WARNING") {
    return "warning";
  }
  return "default";
}

function makeDraftId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function CompactMetricCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "danger" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "danger"
      ? "text-danger"
      : tone === "warning"
      ? "text-warning"
      : "text-text";

  return (
    <article className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </p>
      <p className={`mt-2 font-mono text-2xl font-bold leading-tight ${toneClass}`}>
        {formatCurrency(value)}
      </p>
    </article>
  );
}

export default function BudgetsPage() {
  const queryClient = useQueryClient();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const { user, isAdmin, token } = useAuth();
  const { selectedUserId } = useUserScope();
  const userId = isAdmin ? selectedUserId ?? user?.UserID : user?.UserID;

  const [filterYear, setFilterYear] = useState<number>(currentYear);
  const [filterMonth, setFilterMonth] = useState<number>(currentMonth);

  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [budgetModalMode, setBudgetModalMode] = useState<BudgetModalMode>("ADD");
  const [editingBudget, setEditingBudget] = useState<BudgetCategoryGuardrail | null>(null);
  const [budgetForm, setBudgetForm] = useState<BudgetFormState>(defaultBudgetForm);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState<SettingsFormState>(defaultSettingsForm);

  const [isCanSpendOpen, setIsCanSpendOpen] = useState(false);
  const [canSpendCategoryId, setCanSpendCategoryId] = useState<number>(0);
  const [canSpendAmount, setCanSpendAmount] = useState<string>("");
  const [canSpendError, setCanSpendError] = useState<string | null>(null);
  const [canSpendResult, setCanSpendResult] = useState<{
    decision: string;
    message: string;
    remaining_before: number;
    remaining_after: number;
    safe_daily_spend: number;
    usage_percent_after: number | null;
    requires_confirmation: boolean;
  } | null>(null);

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: getMetaCategories,
  });

  const overviewQuery = useQuery({
    queryKey: ["budget-overview", userId, filterYear, filterMonth],
    queryFn: () =>
      getBudgetOverview({
        user_id: userId,
        budget_year: filterYear,
        budget_month: filterMonth,
      }),
    enabled: Boolean(userId),
  });

  const settingsQuery = useQuery({
    queryKey: ["budget-settings", userId, filterYear, filterMonth],
    queryFn: () =>
      getBudgetSettings({
        user_id: userId,
        budget_year: filterYear,
        budget_month: filterMonth,
      }),
    enabled: Boolean(userId),
  });

  const remindersQuery = useQuery({
    queryKey: ["dashboard-reminders", userId],
    queryFn: () => getDashboardReminders(userId),
    enabled: Boolean(userId),
  });

  const { hiddenReminderIds, dismissReminder } = useReminderVisibility({
    userId,
    accessToken: token,
  });

  useEffect(() => {
    if (!settingsQuery.data) {
      return;
    }

    const incomingItems: FixedExpenseItem[] = settingsQuery.data.fixed_expense_items || [];
    const mappedItems =
      incomingItems.length > 0
        ? incomingItems.map((item) => ({
            id: makeDraftId(),
            item_name: item.item_name,
            category_id: Number(item.category_id || 0),
            amount: toFormattedInteger(item.amount),
          }))
        : [];

    setSettingsForm({
      expectedIncome: toFormattedInteger(settingsQuery.data.expected_income),
      goalContributionTarget: toFormattedInteger(settingsQuery.data.goal_contribution_target),
      emergencyBuffer: toFormattedInteger(settingsQuery.data.emergency_buffer),
      fixedExpenseItems: mappedItems,
    });
  }, [settingsQuery.data]);

  const refreshBudgetData = async () => {
    await queryClient.invalidateQueries({ queryKey: ["budget-overview", userId] });
    await queryClient.invalidateQueries({ queryKey: ["budget-settings", userId] });
  };

  const createBudgetMutation = useMutation({
    mutationFn: createBudgetPlan,
    onSuccess: async () => {
      await refreshBudgetData();
      setIsBudgetModalOpen(false);
      setEditingBudget(null);
    },
  });

  const updateBudgetMutation = useMutation({
    mutationFn: ({ budgetId, payload }: { budgetId: number; payload: Parameters<typeof updateBudgetPlan>[1] }) =>
      updateBudgetPlan(budgetId, payload),
    onSuccess: async () => {
      await refreshBudgetData();
      setIsBudgetModalOpen(false);
      setEditingBudget(null);
    },
  });

  const deleteBudgetMutation = useMutation({
    mutationFn: ({ budgetId, uid }: { budgetId: number; uid: number }) => deleteBudgetPlan(budgetId, uid),
    onSuccess: async () => {
      await refreshBudgetData();
      setIsBudgetModalOpen(false);
      setEditingBudget(null);
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: upsertBudgetSettings,
    onSuccess: async () => {
      await refreshBudgetData();
      setIsSettingsModalOpen(false);
    },
  });

  const canSpendMutation = useMutation({ mutationFn: canISpend });

  const categoryGuardrails = useMemo(
    () => overviewQuery.data?.categories || [],
    [overviewQuery.data?.categories],
  );

  const categoryOptions = useMemo(() => categoriesQuery.data || [], [categoriesQuery.data]);

  const fixedExpenseTotal = useMemo(
    () =>
      settingsForm.fixedExpenseItems.reduce(
        (sum, item) => sum + parseInteger(item.amount),
        0,
      ),
    [settingsForm.fixedExpenseItems],
  );

  const openAddBudgetModal = () => {
    setBudgetModalMode("ADD");
    setEditingBudget(null);
    setBudgetForm(defaultBudgetForm);
    setIsBudgetModalOpen(true);
  };

  const openEditBudgetModal = (row: BudgetCategoryGuardrail) => {
    setBudgetModalMode("EDIT");
    setEditingBudget(row);
    setBudgetForm({
      categoryId: row.category_id,
      plannedAmount: toFormattedInteger(row.planned_amount),
      warningPercent: toFormattedInteger(row.warning_percent),
      isSoftLocked: row.is_soft_locked,
      budgetPriority: (row.budget_priority || "MEDIUM") as "LOW" | "MEDIUM" | "HIGH",
      notes: row.notes || "",
    });
    setIsBudgetModalOpen(true);
  };

  const handleBudgetSubmit = async () => {
    if (!userId) {
      return;
    }
    if (!budgetForm.categoryId) {
      alert("Vui lòng chọn danh mục.");
      return;
    }

    const plannedAmount = parseInteger(budgetForm.plannedAmount);
    const warningPercent = parseInteger(budgetForm.warningPercent);
    if (plannedAmount <= 0) {
      alert("Số tiền dự kiến phải lớn hơn 0.");
      return;
    }
    if (warningPercent < 1 || warningPercent > 100) {
      alert("Ngưỡng cảnh báo phải nằm trong khoảng từ 1 đến 100.");
      return;
    }

    const payload = {
      user_id: userId,
      category_id: budgetForm.categoryId,
      budget_year: filterYear,
      budget_month: filterMonth,
      planned_amount: plannedAmount,
      warning_percent: warningPercent,
      is_soft_locked: budgetForm.isSoftLocked,
      budget_priority: budgetForm.budgetPriority,
      notes: budgetForm.notes.trim() || null,
    };

    try {
      if (budgetModalMode === "ADD") {
        await createBudgetMutation.mutateAsync(payload);
      } else if (editingBudget) {
        await updateBudgetMutation.mutateAsync({
          budgetId: editingBudget.budget_id,
          payload,
        });
      }
    } catch (error) {
      alert(extractApiErrorMessage(error, "Không thể lưu kế hoạch ngân sách."));
    }
  };

  const handleBudgetDelete = async (row: BudgetCategoryGuardrail) => {
    if (!userId) {
      return;
    }
    const confirmed = window.confirm(`Xóa ngân sách cho danh mục "${row.category_name}"?`);
    if (!confirmed) {
      return;
    }
    try {
      await deleteBudgetMutation.mutateAsync({ budgetId: row.budget_id, uid: userId });
    } catch (error) {
      alert(extractApiErrorMessage(error, "Không thể xóa kế hoạch ngân sách."));
    }
  };

  const handleSaveSettings = async () => {
    if (!userId) {
      return;
    }

    const normalizedItems = settingsForm.fixedExpenseItems
      .map((item) => ({
        item_name: item.item_name.trim(),
        category_id: Number(item.category_id || 0),
        amount: parseInteger(item.amount),
      }))
      .filter((item) => item.item_name.length > 0 && item.amount >= 0);

    const hasMissingCategory = normalizedItems.some((item) => item.category_id <= 0);
    if (hasMissingCategory) {
      alert("Mỗi khoản chi cố định cần chọn một danh mục.");
      return;
    }

    try {
      await saveSettingsMutation.mutateAsync({
        user_id: userId,
        budget_year: filterYear,
        budget_month: filterMonth,
        expected_income: parseInteger(settingsForm.expectedIncome),
        fixed_expense_estimate: fixedExpenseTotal,
        goal_contribution_target: parseInteger(settingsForm.goalContributionTarget),
        emergency_buffer: parseInteger(settingsForm.emergencyBuffer),
        fixed_expense_items: normalizedItems,
      });
    } catch (error) {
      alert(extractApiErrorMessage(error, "Không thể lưu thiết lập ngân sách."));
    }
  };

  const handleResetSettings = () => {
    setSettingsForm(defaultSettingsForm);
  };

  const addFixedExpenseItem = () => {
    setSettingsForm((prev) => ({
      ...prev,
      fixedExpenseItems: [
        ...prev.fixedExpenseItems,
        { id: makeDraftId(), item_name: "", category_id: 0, amount: "" },
      ],
    }));
  };

  const removeFixedExpenseItem = (id: string) => {
    setSettingsForm((prev) => ({
      ...prev,
      fixedExpenseItems: prev.fixedExpenseItems.filter((item) => item.id !== id),
    }));
  };

  const updateFixedExpenseItem = (
    id: string,
    field: "item_name" | "amount" | "category_id",
    value: string | number,
  ) => {
    setSettingsForm((prev) => ({
      ...prev,
      fixedExpenseItems: prev.fixedExpenseItems.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]:
                field === "amount"
                  ? formatWithCommas(String(value))
                  : field === "category_id"
                    ? Number(value || 0)
                    : value,
            }
          : item,
      ),
    }));
  };

  const handleCheckCanSpend = async () => {
    if (!userId || !canSpendCategoryId) {
      setCanSpendError("Vui lòng chọn danh mục.");
      return;
    }
    const amount = parseInteger(canSpendAmount);
    if (amount <= 0) {
      setCanSpendError("Vui lòng nhập số tiền lớn hơn 0.");
      return;
    }

    setCanSpendError(null);
    setCanSpendResult(null);
    try {
      const result = await canSpendMutation.mutateAsync({
        user_id: userId,
        category_id: canSpendCategoryId,
        amount,
        budget_year: filterYear,
        budget_month: filterMonth,
      });
      setCanSpendResult(result);
    } catch (error) {
      setCanSpendError(extractApiErrorMessage(error, "Không thể kiểm tra khoản chi này."));
    }
  };

  const isLoading = overviewQuery.isLoading || settingsQuery.isLoading || remindersQuery.isLoading;
  const hasQueryError = overviewQuery.isError || settingsQuery.isError || remindersQuery.isError;

  return (
    <AuthGuard>
      <AppShell
        title="Ngân sách"
        subtitle="Thiết lập giới hạn thông minh cho chi tiêu theo tháng"
        notificationCenter={{
          allReminders: remindersQuery.data || [],
          hiddenReminderIds,
          onDismissReminder: dismissReminder,
        }}
      >
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-surface p-2">
            <select
              className="focus-ring rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text"
              value={filterMonth}
              onChange={(event) => setFilterMonth(Number(event.target.value))}
            >
              {Array.from({ length: 12 }).map((_, index) => (
                <option key={index + 1} value={index + 1}>
                  Tháng {index + 1}
                </option>
              ))}
            </select>
            <input
              type="number"
              className="focus-ring w-28 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text"
              value={filterYear}
              onChange={(event) => setFilterYear(Number(event.target.value))}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="focus-ring inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-text transition hover:bg-surface-hover"
              onClick={() => setIsSettingsModalOpen(true)}
            >
              <Settings2 size={16} />
              Thiết lập ngân sách
            </button>
            <button
              type="button"
              className="focus-ring inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-bg transition hover:bg-primary/90"
              onClick={openAddBudgetModal}
            >
              <Plus size={16} />
              Thêm kế hoạch ngân sách
            </button>
          </div>
        </div>

        {isLoading ? <LoadingSkeleton label="Đang tải dữ liệu ngân sách..." /> : null}

        {hasQueryError ? (
          <ErrorState
            title="Không thể tải dữ liệu ngân sách"
            detail={extractApiErrorMessage(overviewQuery.error || settingsQuery.error || remindersQuery.error)}
            onRetry={() => {
              overviewQuery.refetch();
              settingsQuery.refetch();
              remindersQuery.refetch();
            }}
          />
        ) : null}

        {overviewQuery.data ? (
          <div className="space-y-5">
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-base font-bold text-text">Tổng quan tháng</h2>
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${healthBadgeClass(
                    overviewQuery.data.budget_health,
                  )}`}
                >
                  {budgetHealthLabel(overviewQuery.data.budget_health)}
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <CompactMetricCard label="Thu nhập dự kiến" value={overviewQuery.data.expected_income} />
                <CompactMetricCard
                  label="Có thể phân bổ"
                  value={overviewQuery.data.available_to_budget}
                  tone={overviewQuery.data.available_to_budget >= 0 ? "success" : "danger"}
                />
                <CompactMetricCard label="Tổng đã lập kế hoạch" value={overviewQuery.data.total_planned_budget} />
                <CompactMetricCard
                  label="Còn lại để phân bổ"
                  value={overviewQuery.data.remaining_to_allocate}
                  tone={overviewQuery.data.remaining_to_allocate >= 0 ? "success" : "warning"}
                />
              </div>

              {overviewQuery.data.warnings.length > 0 ? (
                <div className="rounded-xl border border-warning/40 bg-warning/10 p-4">
                  <p className="text-sm font-semibold text-warning">Cảnh báo</p>
                  <div className="mt-1 space-y-1">
                    {overviewQuery.data.warnings.map((warning, index) => (
                      <p key={`${warning}-${index}`} className="text-sm text-warning">
                        {warning}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-text">Chi phí cố định</h2>
              {overviewQuery.data.fixed_expense_cards.length === 0 ? (
                <p className="text-sm text-muted">Chưa có khoản chi cố định cho tháng này.</p>
              ) : (
                <div className="space-y-3">
                  {overviewQuery.data.fixed_expense_cards.map((card) => (
                    <BudgetItemCard
                      key={card.card_id}
                      icon={card.category_icon}
                      iconName={card.category_name}
                      title={card.item_name}
                      subtitle={card.category_name}
                      plannedAmount={card.planned_amount}
                      spentAmount={card.spent_amount}
                      remainingAmount={card.remaining_amount}
                      usagePercent={card.usage_percent}
                      alertLevel={card.alert_level}
                      paceStatus={card.spending_pace_status}
                      isSoftLocked={false}
                      safePerDay={card.safe_daily_spend}
                      safePerWeek={card.safe_weekly_spend}
                      onEdit={() => setIsSettingsModalOpen(true)}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-text">Ngân sách theo danh mục</h2>
              {categoryGuardrails.length === 0 ? (
                <p className="text-sm text-muted">Chưa có kế hoạch ngân sách cho tháng này.</p>
              ) : (
                <div className="space-y-3">
                  {categoryGuardrails.map((row) => (
                    <BudgetItemCard
                      key={row.budget_id}
                      icon={row.category_icon}
                      iconName={row.category_name}
                      title={row.category_name}
                      plannedAmount={row.planned_amount}
                      spentAmount={row.spent_amount}
                      remainingAmount={row.remaining_budget}
                      usagePercent={row.usage_percent}
                      alertLevel={row.alert_level}
                      paceStatus={row.spending_pace_status}
                      isSoftLocked={row.is_soft_locked === 1}
                      safePerDay={row.safe_daily_spend}
                      safePerWeek={row.safe_weekly_spend}
                      priority={row.budget_priority}
                      onEdit={() => openEditBudgetModal(row)}
                      onDelete={() => handleBudgetDelete(row)}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : null}

        {isSettingsModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
            <div className="w-full max-w-3xl rounded-2xl border border-border bg-surface p-6 shadow-2xl">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-bold text-text">Thiết lập ngân sách</h2>
                <button
                  type="button"
                  className="rounded-md p-1 text-muted transition hover:bg-surface-hover hover:text-text"
                  onClick={() => setIsSettingsModalOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block text-muted">Thu nhập dự kiến theo tháng</span>
                  <input
                    className="focus-ring w-full rounded-lg border border-border bg-bg px-3 py-2 text-right text-text"
                    value={settingsForm.expectedIncome}
                    onChange={(event) =>
                      setSettingsForm((prev) => ({
                        ...prev,
                        expectedIncome: formatWithCommas(event.target.value),
                      }))
                    }
                  />
                </label>
                <div className="rounded-lg border border-border bg-bg p-3 text-sm">
                  <p className="text-xs text-muted">Tổng chi phí cố định</p>
                  <p className="mt-1 font-mono text-lg font-bold text-text">
                    {formatCurrency(fixedExpenseTotal)}
                  </p>
                </div>
                <label className="text-sm">
                  <span className="mb-1 block text-muted">Mục tiêu đóng góp cho mục tiêu tài chính</span>
                  <input
                    className="focus-ring w-full rounded-lg border border-border bg-bg px-3 py-2 text-right text-text"
                    value={settingsForm.goalContributionTarget}
                    onChange={(event) =>
                      setSettingsForm((prev) => ({
                        ...prev,
                        goalContributionTarget: formatWithCommas(event.target.value),
                      }))
                    }
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block text-muted">Quỹ dự phòng khẩn cấp</span>
                  <input
                    className="focus-ring w-full rounded-lg border border-border bg-bg px-3 py-2 text-right text-text"
                    value={settingsForm.emergencyBuffer}
                    onChange={(event) =>
                      setSettingsForm((prev) => ({
                        ...prev,
                        emergencyBuffer: formatWithCommas(event.target.value),
                      }))
                    }
                  />
                </label>
              </div>

              <div className="mt-5 rounded-xl border border-border bg-bg p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-text">Danh sách chi phí cố định</h3>
                  <button
                    type="button"
                    onClick={addFixedExpenseItem}
                    className="focus-ring inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-bold text-text transition hover:bg-surface-hover"
                  >
                    <Plus size={12} />
                    Thêm khoản
                  </button>
                </div>

                {settingsForm.fixedExpenseItems.length === 0 ? (
                  <p className="text-xs text-muted">
                    Chưa có khoản chi cố định. Hãy thêm các khoản chi lặp lại hằng tháng tại đây.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {settingsForm.fixedExpenseItems.map((item) => (
                      <div key={item.id} className="grid gap-2 md:grid-cols-[1fr_220px_160px_auto]">
                        <input
                          className="focus-ring rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
                          placeholder="Tên khoản (ví dụ: Tiền nhà)"
                          value={item.item_name}
                          onChange={(event) =>
                            updateFixedExpenseItem(item.id, "item_name", event.target.value)
                          }
                        />
                        <select
                          className="focus-ring rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text"
                          value={item.category_id}
                          onChange={(event) =>
                            updateFixedExpenseItem(item.id, "category_id", Number(event.target.value))
                          }
                        >
                          <option value={0}>Chọn danh mục</option>
                          {categoryOptions.map((row) => (
                            <option key={row.CategoryID} value={row.CategoryID}>
                              {getCategoryIcon(row.IconEmoji, row.CategoryName)} {row.CategoryName}
                            </option>
                          ))}
                        </select>
                        <input
                          className="focus-ring rounded-lg border border-border bg-surface px-3 py-2 text-right text-sm text-text"
                          placeholder="0"
                          value={item.amount}
                          onChange={(event) =>
                            updateFixedExpenseItem(item.id, "amount", event.target.value)
                          }
                        />
                        <button
                          type="button"
                          onClick={() => removeFixedExpenseItem(item.id)}
                          className="focus-ring inline-flex items-center justify-center rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-danger transition hover:bg-danger/20"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  className="focus-ring rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text transition hover:bg-surface-hover"
                  onClick={handleResetSettings}
                >
                  Đặt lại về 0
                </button>
                <button
                  type="button"
                  className="focus-ring rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text transition hover:bg-surface-hover"
                  onClick={() => setIsSettingsModalOpen(false)}
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={saveSettingsMutation.isPending}
                  className="focus-ring rounded-lg bg-primary px-4 py-2 text-sm font-bold text-bg transition hover:bg-primary/90 disabled:opacity-60"
                >
                  {saveSettingsMutation.isPending ? "Đang lưu..." : "Lưu"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {isBudgetModalOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-2xl border border-border bg-surface p-6 shadow-2xl">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-bold text-text">
                  {budgetModalMode === "ADD" ? "Thêm kế hoạch ngân sách" : "Sửa kế hoạch ngân sách"}
                </h2>
                <button
                  type="button"
                  className="rounded-md p-1 text-muted transition hover:bg-surface-hover hover:text-text"
                  onClick={() => {
                    setIsBudgetModalOpen(false);
                    setEditingBudget(null);
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block text-muted">Danh mục</span>
                  <select
                    className="focus-ring w-full rounded-lg border border-border bg-bg px-3 py-2 text-text"
                    value={budgetForm.categoryId}
                    onChange={(event) =>
                      setBudgetForm((prev) => ({
                        ...prev,
                        categoryId: Number(event.target.value),
                      }))
                    }
                  >
                    <option value={0}>Chọn danh mục</option>
                    {categoryOptions.map((row) => (
                      <option key={row.CategoryID} value={row.CategoryID}>
                        {getCategoryIcon(row.IconEmoji, row.CategoryName)} {row.CategoryName}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm">
                  <span className="mb-1 block text-muted">Số tiền dự kiến</span>
                  <input
                    className="focus-ring w-full rounded-lg border border-border bg-bg px-3 py-2 text-right text-text"
                    value={budgetForm.plannedAmount}
                    onChange={(event) =>
                      setBudgetForm((prev) => ({
                        ...prev,
                        plannedAmount: formatWithCommas(event.target.value),
                      }))
                    }
                  />
                </label>

                <label className="text-sm">
                  <span className="mb-1 block text-muted">Ngưỡng cảnh báo (%)</span>
                  <input
                    className="focus-ring w-full rounded-lg border border-border bg-bg px-3 py-2 text-right text-text"
                    value={budgetForm.warningPercent}
                    onChange={(event) =>
                      setBudgetForm((prev) => ({
                        ...prev,
                        warningPercent: formatWithCommas(event.target.value),
                      }))
                    }
                  />
                </label>

                <label className="text-sm">
                  <span className="mb-1 block text-muted">Khóa mềm</span>
                  <select
                    className="focus-ring w-full rounded-lg border border-border bg-bg px-3 py-2 text-text"
                    value={budgetForm.isSoftLocked}
                    onChange={(event) =>
                      setBudgetForm((prev) => ({
                        ...prev,
                        isSoftLocked: Number(event.target.value),
                      }))
                    }
                  >
                    <option value={0}>Không</option>
                    <option value={1}>Có</option>
                  </select>
                </label>

                <label className="text-sm">
                  <span className="mb-1 block text-muted">Mức ưu tiên</span>
                  <select
                    className="focus-ring w-full rounded-lg border border-border bg-bg px-3 py-2 text-text"
                    value={budgetForm.budgetPriority}
                    onChange={(event) =>
                      setBudgetForm((prev) => ({
                        ...prev,
                        budgetPriority: event.target.value as "LOW" | "MEDIUM" | "HIGH",
                      }))
                    }
                  >
                    <option value="LOW">Thấp</option>
                    <option value="MEDIUM">Trung bình</option>
                    <option value="HIGH">Cao</option>
                  </select>
                </label>

                <label className="text-sm md:col-span-2">
                  <span className="mb-1 block text-muted">Ghi chú</span>
                  <input
                    className="focus-ring w-full rounded-lg border border-border bg-bg px-3 py-2 text-text"
                    value={budgetForm.notes}
                    onChange={(event) =>
                      setBudgetForm((prev) => ({
                        ...prev,
                        notes: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <div className="mt-6 flex flex-wrap justify-end gap-2">
                {budgetModalMode === "EDIT" && editingBudget ? (
                  <button
                    type="button"
                    className="focus-ring rounded-lg border border-danger/40 bg-danger/10 px-4 py-2 text-sm font-bold text-danger transition hover:bg-danger/20"
                    onClick={() => handleBudgetDelete(editingBudget)}
                    disabled={deleteBudgetMutation.isPending}
                  >
                    Xóa
                  </button>
                ) : null}
                <button
                  type="button"
                  className="focus-ring rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text transition hover:bg-surface-hover"
                  onClick={() => {
                    setIsBudgetModalOpen(false);
                    setEditingBudget(null);
                  }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleBudgetSubmit}
                  disabled={createBudgetMutation.isPending || updateBudgetMutation.isPending}
                  className="focus-ring rounded-lg bg-primary px-4 py-2 text-sm font-bold text-bg transition hover:bg-primary/90 disabled:opacity-60"
                >
                  {createBudgetMutation.isPending || updateBudgetMutation.isPending
                    ? "Đang lưu..."
                    : "Lưu"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          aria-label="Mở trợ lý kiểm tra khoản chi"
          className="focus-ring fixed bottom-6 right-6 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full border border-primary/40 bg-primary text-bg shadow-xl transition hover:bg-primary/90"
          onClick={() => setIsCanSpendOpen((prev) => !prev)}
        >
          {isCanSpendOpen ? <X size={22} /> : <MessageCircle size={22} />}
        </button>

        {isCanSpendOpen ? (
          <div className="fixed bottom-24 right-6 z-40 w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-border bg-surface p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-text">Tôi có thể chi không?</h3>
              <button
                type="button"
                className="rounded-md p-1 text-muted transition hover:bg-surface-hover hover:text-text"
                onClick={() => setIsCanSpendOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs">
                <span className="mb-1 block text-muted">Danh mục</span>
                <select
                  className="focus-ring w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text"
                  value={canSpendCategoryId}
                  onChange={(event) => setCanSpendCategoryId(Number(event.target.value))}
                >
                  <option value={0}>Chọn danh mục</option>
                  {categoryGuardrails.map((row) => (
                    <option key={row.budget_id} value={row.category_id}>
                      {getCategoryIcon(row.category_icon, row.category_name)} {row.category_name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs">
                <span className="mb-1 block text-muted">Số tiền</span>
                <input
                  className="focus-ring w-full rounded-lg border border-border bg-bg px-3 py-2 text-right text-sm text-text"
                  value={canSpendAmount}
                  onChange={(event) => setCanSpendAmount(formatWithCommas(event.target.value))}
                  placeholder="1,000,000"
                />
              </label>

              <button
                type="button"
                onClick={handleCheckCanSpend}
                disabled={canSpendMutation.isPending}
                className="focus-ring w-full rounded-lg bg-primary px-3 py-2 text-sm font-bold text-bg transition hover:bg-primary/90 disabled:opacity-60"
              >
                {canSpendMutation.isPending ? "Đang kiểm tra..." : "Kiểm tra"}
              </button>
            </div>

            {canSpendError ? (
              <div className="mt-3 rounded-xl border border-danger/40 bg-danger/10 p-3 text-xs text-danger">
                {canSpendError}
              </div>
            ) : null}

            {canSpendResult ? (
              <div className="mt-3 space-y-2">
                <div className="rounded-xl border border-border bg-bg p-3 text-xs text-muted">
                  Tôi có thể chi {canSpendAmount || "0"} cho danh mục này không?
                </div>
                <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 text-xs">
                  <p className="font-bold text-primary">{decisionLabel(canSpendResult.decision)}</p>
                  <p className="mt-1 text-text">{canSpendResult.message}</p>
                  <p className="mt-2 text-muted">
                    Còn lại trước khi chi:{" "}
                    <span className="font-semibold text-text">
                      {formatCurrency(canSpendResult.remaining_before)}
                    </span>
                  </p>
                  <p className="text-muted">
                    Còn lại sau khi chi:{" "}
                    <span className="font-semibold text-text">
                      {formatCurrency(canSpendResult.remaining_after)}
                    </span>
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </AppShell>
    </AuthGuard>
  );
}

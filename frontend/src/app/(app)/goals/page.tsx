"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { AuthGuard } from "@/components/auth/auth-guard";
import { ErrorState } from "@/components/common/error-state";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { AppShell } from "@/components/layout/app-shell";
import {
  extractApiErrorMessage,
  getMetaAccounts
} from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  useCreateGoal,
  useCreateGoalContribution,
  useDeleteGoal,
  useGoalProgress,
  useUpdateGoal
} from "@/hooks/use-goals";
import { useAuth } from "@/providers/auth-provider";
import { useUserScope } from "@/providers/user-scope-provider";
import type { GoalProgressRecord } from "@/types/api";

type GoalTab = "SAVE_UP" | "PAY_DOWN";
type GoalFormMode = "CREATE" | "EDIT";

type GoalFormState = {
  goalId?: number;
  goalName: string;
  goalType: GoalTab;
  linkedAccountId: string;
  targetAmount: string;
  currentAmount: string;
  startDate: string;
  targetDate: string;
  annualGrowthRate: string;
  status: string;
  notes: string;
};

type ContributionFormState = {
  goalId: number;
  goalName: string;
  goalType: GoalTab;
  accountId: string;
  amount: string;
  contributionType: "DEPOSIT" | "WITHDRAW";
  contributionDate: string;
  description: string;
};

const tabs: { label: string; value: GoalTab }[] = [
  { label: "Tích lũy", value: "SAVE_UP" },
  { label: "Trả nợ", value: "PAY_DOWN" }
];

const today = new Date().toISOString().slice(0, 10);

function getGoalIcon(goal: GoalProgressRecord): string {
  const name = goal.GoalName.toLowerCase();
  const type = String(goal.GoalType || "").toUpperCase();

  if (name.includes("laptop") || name.includes("computer")) return "💻";
  if (name.includes("emergency")) return "🛟";
  if (name.includes("vacation") || name.includes("travel") || name.includes("trip")) return "🏝️";
  if (name.includes("home") || name.includes("house")) return "🏠";
  if (name.includes("retirement")) return "🌅";
  if (name.includes("car")) return "🚗";
  if (name.includes("education") || name.includes("school") || name.includes("study")) return "🎓";
  if (name.includes("wedding")) return "💍";
  if (name.includes("health") || name.includes("medical")) return "🏥";
  if (name.includes("phone")) return "📱";
  if (name.includes("bike") || name.includes("motorbike")) return "🏍️";
  if (name.includes("business")) return "💼";
  if (name.includes("investment") || name.includes("invest")) return "📈";
  if (name.includes("gift")) return "🎁";
  if (name.includes("nợ") || name.includes("no ") || name.includes("vay")) return "💳";
  if (name.includes("debt") || name.includes("loan") || name.includes("credit")) return "💳";

  if (type === "PAY_DOWN") return "💳";

  return "🎯";
}

function getStatusClass(alertLevel: string): string {
  const normalized = String(alertLevel || "").toUpperCase();

  if (normalized === "COMPLETED") {
    return "bg-success/10 text-success";
  }

  if (normalized === "OVERDUE") {
    return "bg-danger/10 text-danger";
  }

  if (normalized === "DUE_SOON") {
    return "bg-warning/10 text-warning";
  }

  if (normalized === "CANCELLED") {
    return "bg-muted/10 text-muted";
  }

  return "bg-success/10 text-success";
}

function getProgressBarClass(alertLevel: string): string {
  const normalized = String(alertLevel || "").toUpperCase();

  if (normalized === "OVERDUE") return "bg-danger";
  if (normalized === "DUE_SOON") return "bg-warning";
  if (normalized === "COMPLETED") return "bg-success";

  return "bg-success";
}

function getGoalAlertLabel(alertLevel: string): string {
  const normalized = String(alertLevel || "").toUpperCase();
  if (normalized === "COMPLETED") return "HOÀN THÀNH";
  if (normalized === "OVERDUE") return "QUÁ HẠN";
  if (normalized === "DUE_SOON") return "SẮP ĐẾN HẠN";
  if (normalized === "CANCELLED") return "ĐÃ HỦY";
  return "ĐANG THỰC HIỆN";
}

function buildCreateForm(goalType: GoalTab): GoalFormState {
  return {
    goalName: "",
    goalType,
    linkedAccountId: "",
    targetAmount: "",
    currentAmount: "0",
    startDate: today,
    targetDate: "",
    annualGrowthRate: "0",
    status: "ACTIVE",
    notes: ""
  };
}

function stripNonDigits(value: string): string {
  return (value || "").replace(/\D/g, "");
}

function formatIntegerInput(value: string): string {
  const digits = stripNonDigits(value);
  if (!digits) {
    return "";
  }
  return Number(digits).toLocaleString("en-US");
}

function parseIntegerInput(value: string): number {
  const digits = stripNonDigits(value);
  if (!digits) {
    return 0;
  }
  return Number(digits);
}

function buildEditForm(goal: GoalProgressRecord): GoalFormState {
  const targetAmount = Math.max(0, Math.trunc(Number(goal.TargetAmount || 0)));
  const currentAmount = Math.max(0, Math.trunc(Number(goal.CurrentAmount || 0)));

  return {
    goalId: goal.GoalID,
    goalName: goal.GoalName,
    goalType: String(goal.GoalType).toUpperCase() === "PAY_DOWN" ? "PAY_DOWN" : "SAVE_UP",
    linkedAccountId: goal.LinkedAccountID ? String(goal.LinkedAccountID) : "",
    targetAmount: formatIntegerInput(String(targetAmount)),
    currentAmount: formatIntegerInput(String(currentAmount)),
    startDate: goal.StartDate ? String(goal.StartDate).slice(0, 10) : today,
    targetDate: goal.TargetDate ? String(goal.TargetDate).slice(0, 10) : "",
    annualGrowthRate: String(goal.AnnualGrowthRate ?? 0),
    status: goal.Status || "ACTIVE",
    notes: goal.Notes || ""
  };
}

function toNumber(value: string, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function GoalsPage() {
  const { user, isAdmin } = useAuth();
  const { selectedUserId } = useUserScope();
  const userId = isAdmin ? selectedUserId ?? user?.UserID : user?.UserID;

  const [activeTab, setActiveTab] = useState<GoalTab>("SAVE_UP");
  const [goalFormMode, setGoalFormMode] = useState<GoalFormMode>("CREATE");
  const [goalFormOpen, setGoalFormOpen] = useState(false);
  const [goalForm, setGoalForm] = useState<GoalFormState>(() => buildCreateForm("SAVE_UP"));
  const [contributionForm, setContributionForm] = useState<ContributionFormState | null>(null);

  const goalsQuery = useGoalProgress(userId);
  const createGoalMutation = useCreateGoal(userId);
  const updateGoalMutation = useUpdateGoal(userId);
  const deleteGoalMutation = useDeleteGoal(userId);
  const contributionMutation = useCreateGoalContribution(userId);

  const accountsQuery = useQuery({
    queryKey: ["accounts", userId],
    queryFn: () => getMetaAccounts(userId),
    enabled: Boolean(userId)
  });

  const goals = goalsQuery.data || [];
  const visibleGoals = useMemo(() => {
    return goals.filter((goal) => String(goal.GoalType).toUpperCase() === activeTab);
  }, [goals, activeTab]);

  const summary = useMemo(() => {
    const activeGoals = visibleGoals.filter((goal) => goal.Status !== "CANCELLED");
    const totalTarget = activeGoals.reduce((sum, goal) => sum + Number(goal.TargetAmount || 0), 0);
    const totalCurrent = activeGoals.reduce((sum, goal) => sum + Number(goal.CurrentAmount || 0), 0);
    const completed = activeGoals.filter((goal) => goal.GoalAlertLevel === "COMPLETED").length;
    const dueSoon = activeGoals.filter((goal) => goal.GoalAlertLevel === "DUE_SOON").length;
    const progress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;
    const remaining = Math.max(totalTarget - totalCurrent, 0);

    return {
      totalTarget,
      totalCurrent,
      completed,
      dueSoon,
      progress,
      remaining
    };
  }, [visibleGoals]);

  const openCreateForm = () => {
    setGoalFormMode("CREATE");
    setGoalForm(buildCreateForm(activeTab));
    setGoalFormOpen(true);
  };

  const openEditForm = (goal: GoalProgressRecord) => {
    setGoalFormMode("EDIT");
    setGoalForm(buildEditForm(goal));
    setGoalFormOpen(true);
  };

  const closeGoalForm = () => {
    setGoalFormOpen(false);
    setGoalForm(buildCreateForm(activeTab));
  };

  const submitGoalForm = async () => {
    if (!userId) return;

    const payload = {
      user_id: userId,
      linked_account_id: goalForm.linkedAccountId ? Number(goalForm.linkedAccountId) : null,
      goal_name: goalForm.goalName.trim(),
      goal_type: goalForm.goalType,
      target_amount: parseIntegerInput(goalForm.targetAmount),
      current_amount: parseIntegerInput(goalForm.currentAmount),
      start_date: goalForm.startDate || null,
      target_date: goalForm.targetDate || null,
      annual_growth_rate: toNumber(goalForm.annualGrowthRate),
      status: goalForm.status,
      notes: goalForm.notes.trim() || null
    };

    if (!payload.goal_name) {
      window.alert("Vui lòng nhập tên mục tiêu.");
      return;
    }

    if (payload.target_amount <= 0) {
      window.alert("Số tiền mục tiêu phải lớn hơn 0.");
      return;
    }

    if (payload.current_amount < 0) {
      window.alert("Số tiền hiện tại không được âm.");
      return;
    }

    if (goalFormMode === "CREATE") {
      await createGoalMutation.mutateAsync(payload);
    } else if (goalForm.goalId) {
      await updateGoalMutation.mutateAsync({
        goalId: goalForm.goalId,
        payload: {
          ...payload,
          current_amount: payload.current_amount,
          status: payload.status
        }
      });
    }

    closeGoalForm();
  };

  const openContributionForm = (goal: GoalProgressRecord) => {
    const isPayDown = String(goal.GoalType || "").toUpperCase() === "PAY_DOWN";
    setContributionForm({
      goalId: goal.GoalID,
      goalName: goal.GoalName,
      goalType: isPayDown ? "PAY_DOWN" : "SAVE_UP",
      accountId: goal.LinkedAccountID ? String(goal.LinkedAccountID) : "",
      amount: "",
      contributionType: "DEPOSIT",
      contributionDate: today,
      description: ""
    });
  };

  const submitContributionForm = async () => {
    if (!userId || !contributionForm) return;

    const amount = toNumber(contributionForm.amount);

    if (amount <= 0) {
      window.alert("Số tiền đóng góp phải lớn hơn 0.");
      return;
    }

    await contributionMutation.mutateAsync({
      goalId: contributionForm.goalId,
      payload: {
        user_id: userId,
        account_id: contributionForm.accountId ? Number(contributionForm.accountId) : null,
        amount,
        contribution_type: contributionForm.contributionType,
        contribution_date: contributionForm.contributionDate || today,
        description: contributionForm.description.trim() || null
      }
    });

    setContributionForm(null);
  };

  const handleDeleteGoal = async (goal: GoalProgressRecord) => {
    if (!userId) return;

    const confirmed = window.confirm(`Bạn có chắc muốn xóa mục tiêu "${goal.GoalName}"?`);
    if (!confirmed) return;

    await deleteGoalMutation.mutateAsync({ goalId: goal.GoalID, userId });
  };

  const mutating =
    createGoalMutation.isPending ||
    updateGoalMutation.isPending ||
    deleteGoalMutation.isPending ||
    contributionMutation.isPending;

  return (
    <AuthGuard>
      <AppShell
        title="Mục tiêu"
        subtitle="Theo dõi mục tiêu tài chính, tài khoản liên kết và tiến độ hoàn thành."
      >
        <div className="space-y-6">
          <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex rounded-xl border border-border bg-bg p-1">
                {tabs.map((tab) => {
                  const active = activeTab === tab.value;

                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.value);
                        setGoalForm(buildCreateForm(tab.value));
                      }}
                      className={`focus-ring rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
                        active
                          ? "bg-primary text-white"
                          : "text-muted hover:bg-surface-hover hover:text-text"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                className="focus-ring rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-primary/90"
                onClick={openCreateForm}
              >
                + Thêm mục tiêu
              </button>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label={activeTab === "PAY_DOWN" ? "Tổng dư nợ mục tiêu" : "Tổng mục tiêu"}
              value={formatCurrency(summary.totalTarget)}
            />
            <SummaryCard
              label={activeTab === "PAY_DOWN" ? "Đã trả" : "Tiến độ hiện tại"}
              value={formatCurrency(summary.totalCurrent)}
            />
            <SummaryCard label="Mục tiêu đã hoàn thành" value={String(summary.completed)} />
            <SummaryCard
              label={activeTab === "PAY_DOWN" ? "Còn phải trả" : "Sắp đến hạn"}
              value={
                activeTab === "PAY_DOWN"
                  ? formatCurrency(summary.remaining)
                  : String(summary.dueSoon)
              }
            />
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-text">
                    {activeTab === "SAVE_UP" ? "Mục tiêu tích lũy" : "Mục tiêu trả nợ"}
                  </h2>
                  <p className="mt-1 text-xs text-muted">
                    {activeTab === "SAVE_UP"
                      ? "Mục tiêu tiết kiệm gắn với các nhu cầu tài chính trong tương lai."
                      : "Mục tiêu trả nợ hoặc nghĩa vụ tài chính theo số dư mục tiêu."}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="font-mono text-xl font-black text-text">
                    {summary.progress.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted">tiến độ trung bình</p>
                </div>
              </div>

              {goalsQuery.isLoading ? (
                <LoadingSkeleton label="Đang tải mục tiêu..." />
              ) : null}

              {goalsQuery.isError ? (
                <ErrorState
                  title="Không thể tải mục tiêu"
                  detail={extractApiErrorMessage(goalsQuery.error)}
                  onRetry={() => goalsQuery.refetch()}
                />
              ) : null}

              {!goalsQuery.isLoading && !goalsQuery.isError && visibleGoals.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-bg p-8 text-center">
                  <p className="text-sm font-semibold text-text">Chưa có mục tiêu nào.</p>
                  <p className="mt-2 text-sm text-muted">
                    Tạo mục tiêu đầu tiên để bắt đầu theo dõi tiến độ cho người dùng này.
                  </p>
                  <button
                    type="button"
                    className="focus-ring mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white"
                    onClick={openCreateForm}
                  >
                    + Thêm mục tiêu
                  </button>
                </div>
              ) : null}

              <div className="space-y-5">
                {visibleGoals.map((goal) => {
                  const progress = Math.min(Number(goal.ProgressPercent || 0), 100);
                  const statusClass = getStatusClass(goal.GoalAlertLevel);
                  const barClass = getProgressBarClass(goal.GoalAlertLevel);

                  return (
                    <article
                      key={goal.GoalID}
                      className="grid gap-4 border-b border-border pb-5 last:border-b-0 last:pb-0 md:grid-cols-[64px_minmax(0,1fr)_190px]"
                    >
                      <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-border bg-bg text-3xl shadow-sm">
                        {getGoalIcon(goal)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-text">{goal.GoalName}</h3>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${statusClass}`}
                          >
                            {getGoalAlertLabel(goal.GoalAlertLevel)}
                          </span>
                          <span className="text-xs text-muted">
                            {goal.TargetDate ? formatDate(String(goal.TargetDate)) : "Chưa đặt ngày đích"}
                          </span>
                        </div>

                        <p className="mt-1 text-xs text-muted">
                          {goal.BankName ? `Liên kết với ${goal.BankName}` : "Chưa liên kết tài khoản"}
                          {goal.MonthlyRequired !== null && goal.MonthlyRequired !== undefined
                            ? ` · Cần ${formatCurrency(goal.MonthlyRequired)} mỗi tháng`
                            : ""}
                        </p>

                        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-surface-hover">
                          <div
                            className={`h-full rounded-full ${barClass}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      <div className="text-left md:text-right">
                        <p className="font-mono text-base font-bold text-text">
                          {formatCurrency(goal.CurrentAmount)}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {progress.toFixed(0)}% của {formatCurrency(goal.TargetAmount)}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2 md:justify-end">
                          <button
                            type="button"
                            className="rounded-lg border border-border px-3 py-1 text-xs font-semibold text-text hover:bg-surface-hover"
                            onClick={() => openContributionForm(goal)}
                          >
                            {String(goal.GoalType).toUpperCase() === "PAY_DOWN"
                              ? "Ghi nhận trả nợ"
                              : "Thêm đóng góp"}
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-border px-3 py-1 text-xs font-semibold text-text hover:bg-surface-hover"
                            onClick={() => openEditForm(goal)}
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-danger/30 px-3 py-1 text-xs font-semibold text-danger hover:bg-danger/10"
                            onClick={() => handleDeleteGoal(goal)}
                          >
                            Xóa
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <aside className="space-y-4">
              <section className="rounded-2xl border border-success/20 bg-success/10 p-5">
                <p className="text-xs font-semibold text-muted">Tóm tắt tiến độ</p>
                <p className="mt-2 font-mono text-3xl font-black text-success">
                  {formatCurrency(summary.totalCurrent)}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {activeTab === "PAY_DOWN"
                    ? `Đã trả ${formatCurrency(summary.totalCurrent)} trên tổng dư nợ ${formatCurrency(summary.totalTarget)}.`
                    : `Đã tích lũy hướng tới mục tiêu ${formatCurrency(summary.totalTarget)}.`}
                </p>
              </section>

              <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
                <h3 className="font-bold text-text">Tài khoản liên kết</h3>

                {accountsQuery.isLoading ? (
                  <p className="mt-4 text-sm text-muted">Đang tải tài khoản...</p>
                ) : null}

                {!accountsQuery.isLoading && (accountsQuery.data || []).length === 0 ? (
                  <p className="mt-4 text-sm text-muted">Không tìm thấy tài khoản cho người dùng này.</p>
                ) : null}

                <div className="mt-4 space-y-3">
                  {(accountsQuery.data || []).map((account, index) => (
                    <div
                      key={account.AccountID}
                      className="flex items-center justify-between rounded-xl border border-border bg-bg px-3 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {index + 1}
                        </div>
                        <div>
                          <span className="block text-sm font-medium text-text">
                            {account.BankName}
                          </span>
                          <span className="text-xs text-muted">
                            Số dư {formatCurrency(account.Balance)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </div>

        {goalFormOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-2xl rounded-2xl border border-border bg-surface p-5 shadow-2xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-text">
                    {goalFormMode === "CREATE" ? "Thêm mục tiêu" : "Sửa mục tiêu"}
                  </h2>
                  <p className="text-xs text-muted">
                    Mục tiêu được lưu theo người dùng và hiển thị theo phạm vi hiện tại.
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-lg px-3 py-1 text-sm text-muted hover:bg-surface-hover"
                  onClick={closeGoalForm}
                >
                  Đóng
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Tên mục tiêu">
                  <input
                    className="input"
                    value={goalForm.goalName}
                    onChange={(event) =>
                      setGoalForm((prev) => ({ ...prev, goalName: event.target.value }))
                    }
                    placeholder="Quỹ dự phòng"
                  />
                </Field>

                <Field label="Loại mục tiêu">
                  <select
                    className="input"
                    value={goalForm.goalType}
                    onChange={(event) =>
                      setGoalForm((prev) => ({
                        ...prev,
                        goalType: event.target.value as GoalTab
                      }))
                    }
                  >
                    <option value="SAVE_UP">Tích lũy</option>
                    <option value="PAY_DOWN">Trả nợ</option>
                  </select>
                </Field>

                <Field label="Tài khoản liên kết">
                  <select
                    className="input"
                    value={goalForm.linkedAccountId}
                    onChange={(event) =>
                      setGoalForm((prev) => ({
                        ...prev,
                        linkedAccountId: event.target.value
                      }))
                    }
                  >
                    <option value="">Không liên kết tài khoản</option>
                    {(accountsQuery.data || []).map((account) => (
                      <option key={account.AccountID} value={account.AccountID}>
                        {account.BankName}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Trạng thái">
                  <select
                    className="input"
                    value={goalForm.status}
                    onChange={(event) =>
                      setGoalForm((prev) => ({ ...prev, status: event.target.value }))
                    }
                  >
                    <option value="ACTIVE">Đang thực hiện</option>
                    <option value="COMPLETED">Hoàn thành</option>
                    <option value="CANCELLED">Đã hủy</option>
                  </select>
                </Field>

                <Field label="Số tiền mục tiêu">
                  <input
                    className="input"
                    type="text"
                    inputMode="numeric"
                    value={goalForm.targetAmount}
                    onChange={(event) =>
                      setGoalForm((prev) => ({
                        ...prev,
                        targetAmount: formatIntegerInput(event.target.value)
                      }))
                    }
                  />
                </Field>

                <Field label="Số tiền hiện tại">
                  <input
                    className="input"
                    type="text"
                    inputMode="numeric"
                    value={goalForm.currentAmount}
                    onChange={(event) =>
                      setGoalForm((prev) => ({
                        ...prev,
                        currentAmount: formatIntegerInput(event.target.value)
                      }))
                    }
                  />
                </Field>

                <Field label="Ngày bắt đầu">
                  <input
                    className="input"
                    type="date"
                    value={goalForm.startDate}
                    onChange={(event) =>
                      setGoalForm((prev) => ({ ...prev, startDate: event.target.value }))
                    }
                  />
                </Field>

                <Field label="Ngày đích">
                  <input
                    className="input"
                    type="date"
                    value={goalForm.targetDate}
                    onChange={(event) =>
                      setGoalForm((prev) => ({ ...prev, targetDate: event.target.value }))
                    }
                  />
                </Field>

                <Field label="Tăng trưởng năm (%)">
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={goalForm.annualGrowthRate}
                    onChange={(event) =>
                      setGoalForm((prev) => ({
                        ...prev,
                        annualGrowthRate: event.target.value
                      }))
                    }
                  />
                </Field>

                <Field label="Ghi chú">
                  <input
                    className="input"
                    value={goalForm.notes}
                    onChange={(event) =>
                      setGoalForm((prev) => ({ ...prev, notes: event.target.value }))
                    }
                    placeholder="Ghi chú (tùy chọn)"
                  />
                </Field>
              </div>

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-surface-hover"
                  onClick={closeGoalForm}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                  disabled={mutating}
                  onClick={submitGoalForm}
                >
                  {mutating ? "Đang lưu..." : "Lưu mục tiêu"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {contributionForm ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-5 shadow-2xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-text">
                    {contributionForm.goalType === "PAY_DOWN" ? "Ghi nhận trả nợ" : "Thêm đóng góp"}
                  </h2>
                  <p className="text-xs text-muted">{contributionForm.goalName}</p>
                </div>
                <button
                  type="button"
                  className="rounded-lg px-3 py-1 text-sm text-muted hover:bg-surface-hover"
                  onClick={() => setContributionForm(null)}
                >
                  Đóng
                </button>
              </div>

              <div className="grid gap-4">
                <Field label="Tài khoản">
                  <select
                    className="input"
                    value={contributionForm.accountId}
                    onChange={(event) =>
                      setContributionForm((prev) =>
                        prev ? { ...prev, accountId: event.target.value } : prev
                      )
                    }
                  >
                    <option value="">Không chọn tài khoản</option>
                    {(accountsQuery.data || []).map((account) => (
                      <option key={account.AccountID} value={account.AccountID}>
                        {account.BankName}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Loại giao dịch">
                  <select
                    className="input"
                    value={contributionForm.contributionType}
                    onChange={(event) =>
                      setContributionForm((prev) =>
                        prev
                          ? {
                              ...prev,
                              contributionType: event.target.value as "DEPOSIT" | "WITHDRAW"
                            }
                          : prev
                      )
                    }
                  >
                    <option value="DEPOSIT">
                      {contributionForm.goalType === "PAY_DOWN" ? "Thanh toán nợ" : "Nạp vào"}
                    </option>
                    <option value="WITHDRAW">
                      {contributionForm.goalType === "PAY_DOWN" ? "Giảm đã trả / hoàn tác" : "Rút ra"}
                    </option>
                  </select>
                </Field>

                <Field label="Số tiền">
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={contributionForm.amount}
                    onChange={(event) =>
                      setContributionForm((prev) =>
                        prev ? { ...prev, amount: event.target.value } : prev
                      )
                    }
                  />
                </Field>

                <Field label="Ngày đóng góp">
                  <input
                    className="input"
                    type="date"
                    value={contributionForm.contributionDate}
                    onChange={(event) =>
                      setContributionForm((prev) =>
                        prev ? { ...prev, contributionDate: event.target.value } : prev
                      )
                    }
                  />
                </Field>

                <Field label="Mô tả">
                  <input
                    className="input"
                    value={contributionForm.description}
                    onChange={(event) =>
                      setContributionForm((prev) =>
                        prev ? { ...prev, description: event.target.value } : prev
                      )
                    }
                    placeholder="Mô tả (tùy chọn)"
                  />
                </Field>
              </div>

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-surface-hover"
                  onClick={() => setContributionForm(null)}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                  disabled={mutating}
                  onClick={submitContributionForm}
                >
                  {mutating
                    ? "Đang lưu..."
                    : contributionForm.goalType === "PAY_DOWN"
                      ? "Lưu thanh toán nợ"
                      : "Lưu đóng góp"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <style jsx>{`
          .input {
            width: 100%;
            border-radius: 12px;
            border: 1px solid var(--color-border);
            background: var(--color-bg);
            padding: 10px 12px;
            color: var(--color-text);
            font-size: 14px;
            outline: none;
          }

          .input:focus {
            box-shadow: 0 0 0 2px var(--color-primary);
          }
        `}</style>
      </AppShell>
    </AuthGuard>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="mt-3 font-mono text-2xl font-black text-text">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted">{label}</span>
      {children}
    </label>
  );
}

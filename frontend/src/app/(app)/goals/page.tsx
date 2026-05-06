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
import { formatDate } from "@/lib/format";
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
  accountId: string;
  amount: string;
  contributionType: "DEPOSIT" | "WITHDRAW";
  contributionDate: string;
  description: string;
};

const tabs: { label: string; value: GoalTab }[] = [
  { label: "Save up", value: "SAVE_UP" },
  { label: "Pay down", value: "PAY_DOWN" }
];

const today = new Date().toISOString().slice(0, 10);

function formatCurrency(value: number | null | undefined): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

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

    return {
      totalTarget,
      totalCurrent,
      completed,
      dueSoon,
      progress
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
      window.alert("Goal name is required.");
      return;
    }

    if (payload.target_amount <= 0) {
      window.alert("Target amount must be greater than 0.");
      return;
    }

    if (payload.current_amount < 0) {
      window.alert("Current amount cannot be negative.");
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
    setContributionForm({
      goalId: goal.GoalID,
      goalName: goal.GoalName,
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
      window.alert("Contribution amount must be greater than 0.");
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

    const confirmed = window.confirm(`Delete goal "${goal.GoalName}"?`);
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
        title="Goals"
        subtitle="Track savings goals, linked accounts, and payoff progress by user."
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
                + Add goal
              </button>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Total target" value={formatCurrency(summary.totalTarget)} />
            <SummaryCard label="Current progress" value={formatCurrency(summary.totalCurrent)} />
            <SummaryCard label="Completed goals" value={String(summary.completed)} />
            <SummaryCard label="Due soon" value={String(summary.dueSoon)} />
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-text">
                    {activeTab === "SAVE_UP" ? "Save up goals" : "Pay down goals"}
                  </h2>
                  <p className="mt-1 text-xs text-muted">
                    {activeTab === "SAVE_UP"
                      ? "Savings targets linked to specific future expenses."
                      : "Debt or liability payoff goals tracked by target balance."}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="font-mono text-xl font-black text-text">
                    {summary.progress.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted">average progress</p>
                </div>
              </div>

              {goalsQuery.isLoading ? (
                <LoadingSkeleton label="Loading goals..." />
              ) : null}

              {goalsQuery.isError ? (
                <ErrorState
                  title="Failed to load goals"
                  detail={extractApiErrorMessage(goalsQuery.error)}
                  onRetry={() => goalsQuery.refetch()}
                />
              ) : null}

              {!goalsQuery.isLoading && !goalsQuery.isError && visibleGoals.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-bg p-8 text-center">
                  <p className="text-sm font-semibold text-text">No goals found.</p>
                  <p className="mt-2 text-sm text-muted">
                    Create your first goal to start tracking progress for this user.
                  </p>
                  <button
                    type="button"
                    className="focus-ring mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white"
                    onClick={openCreateForm}
                  >
                    + Add goal
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
                            {goal.GoalAlertLevel}
                          </span>
                          <span className="text-xs text-muted">
                            {goal.TargetDate ? formatDate(String(goal.TargetDate)) : "No target date"}
                          </span>
                        </div>

                        <p className="mt-1 text-xs text-muted">
                          {goal.BankName ? `Linked to ${goal.BankName}` : "No linked account"}
                          {goal.MonthlyRequired !== null && goal.MonthlyRequired !== undefined
                            ? ` · ${formatCurrency(goal.MonthlyRequired)} monthly required`
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
                          {progress.toFixed(0)}% of {formatCurrency(goal.TargetAmount)}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2 md:justify-end">
                          <button
                            type="button"
                            className="rounded-lg border border-border px-3 py-1 text-xs font-semibold text-text hover:bg-surface-hover"
                            onClick={() => openContributionForm(goal)}
                          >
                            Add contribution
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-border px-3 py-1 text-xs font-semibold text-text hover:bg-surface-hover"
                            onClick={() => openEditForm(goal)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="rounded-lg border border-danger/30 px-3 py-1 text-xs font-semibold text-danger hover:bg-danger/10"
                            onClick={() => handleDeleteGoal(goal)}
                          >
                            Delete
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
                <p className="text-xs font-semibold text-muted">Progress summary</p>
                <p className="mt-2 font-mono text-3xl font-black text-success">
                  {formatCurrency(summary.totalCurrent)}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Saved toward {formatCurrency(summary.totalTarget)} target.
                </p>
              </section>

              <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
                <h3 className="font-bold text-text">Linked accounts</h3>

                {accountsQuery.isLoading ? (
                  <p className="mt-4 text-sm text-muted">Loading accounts...</p>
                ) : null}

                {!accountsQuery.isLoading && (accountsQuery.data || []).length === 0 ? (
                  <p className="mt-4 text-sm text-muted">No accounts found for this user.</p>
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
                            Balance {formatCurrency(account.Balance)}
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
                    {goalFormMode === "CREATE" ? "Add goal" : "Edit goal"}
                  </h2>
                  <p className="text-xs text-muted">
                    Goals are stored per user and shown by current user scope.
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-lg px-3 py-1 text-sm text-muted hover:bg-surface-hover"
                  onClick={closeGoalForm}
                >
                  Close
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Goal name">
                  <input
                    className="input"
                    value={goalForm.goalName}
                    onChange={(event) =>
                      setGoalForm((prev) => ({ ...prev, goalName: event.target.value }))
                    }
                    placeholder="Emergency Fund"
                  />
                </Field>

                <Field label="Goal type">
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
                    <option value="SAVE_UP">Save up</option>
                    <option value="PAY_DOWN">Pay down</option>
                  </select>
                </Field>

                <Field label="Linked account">
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
                    <option value="">No linked account</option>
                    {(accountsQuery.data || []).map((account) => (
                      <option key={account.AccountID} value={account.AccountID}>
                        {account.BankName}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Status">
                  <select
                    className="input"
                    value={goalForm.status}
                    onChange={(event) =>
                      setGoalForm((prev) => ({ ...prev, status: event.target.value }))
                    }
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </Field>

                <Field label="Target amount">
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

                <Field label="Current amount">
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

                <Field label="Start date">
                  <input
                    className="input"
                    type="date"
                    value={goalForm.startDate}
                    onChange={(event) =>
                      setGoalForm((prev) => ({ ...prev, startDate: event.target.value }))
                    }
                  />
                </Field>

                <Field label="Target date">
                  <input
                    className="input"
                    type="date"
                    value={goalForm.targetDate}
                    onChange={(event) =>
                      setGoalForm((prev) => ({ ...prev, targetDate: event.target.value }))
                    }
                  />
                </Field>

                <Field label="Annual growth rate">
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

                <Field label="Notes">
                  <input
                    className="input"
                    value={goalForm.notes}
                    onChange={(event) =>
                      setGoalForm((prev) => ({ ...prev, notes: event.target.value }))
                    }
                    placeholder="Optional note"
                  />
                </Field>
              </div>

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-surface-hover"
                  onClick={closeGoalForm}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                  disabled={mutating}
                  onClick={submitGoalForm}
                >
                  {mutating ? "Saving..." : "Save goal"}
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
                  <h2 className="text-lg font-bold text-text">Add contribution</h2>
                  <p className="text-xs text-muted">{contributionForm.goalName}</p>
                </div>
                <button
                  type="button"
                  className="rounded-lg px-3 py-1 text-sm text-muted hover:bg-surface-hover"
                  onClick={() => setContributionForm(null)}
                >
                  Close
                </button>
              </div>

              <div className="grid gap-4">
                <Field label="Account">
                  <select
                    className="input"
                    value={contributionForm.accountId}
                    onChange={(event) =>
                      setContributionForm((prev) =>
                        prev ? { ...prev, accountId: event.target.value } : prev
                      )
                    }
                  >
                    <option value="">No account</option>
                    {(accountsQuery.data || []).map((account) => (
                      <option key={account.AccountID} value={account.AccountID}>
                        {account.BankName}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Type">
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
                    <option value="DEPOSIT">Deposit</option>
                    <option value="WITHDRAW">Withdraw</option>
                  </select>
                </Field>

                <Field label="Amount">
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

                <Field label="Contribution date">
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

                <Field label="Description">
                  <input
                    className="input"
                    value={contributionForm.description}
                    onChange={(event) =>
                      setContributionForm((prev) =>
                        prev ? { ...prev, description: event.target.value } : prev
                      )
                    }
                    placeholder="Optional description"
                  />
                </Field>
              </div>

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text hover:bg-surface-hover"
                  onClick={() => setContributionForm(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                  disabled={mutating}
                  onClick={submitContributionForm}
                >
                  {mutating ? "Saving..." : "Save contribution"}
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

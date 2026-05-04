"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, X } from "lucide-react";

import { AuthGuard } from "@/components/auth/auth-guard";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { BudgetProgressBars } from "@/components/finance/budget-progress-bars";
import { KpiCard } from "@/components/finance/kpi-card";
import { AppShell } from "@/components/layout/app-shell";
import {
  createBudgetPlan,
  deleteBudgetPlan,
  extractApiErrorMessage,
  getBudgetPlans,
  getBudgetStatus,
  getMetaCategories,
  updateBudgetPlan
} from "@/lib/api-client";
import { formatCurrency } from "@/lib/format";
import { useAuth } from "@/providers/auth-provider";
import { useUserScope } from "@/providers/user-scope-provider";

export default function BudgetsPage() {
  const queryClient = useQueryClient();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const { user, isAdmin } = useAuth();
  const { selectedUserId } = useUserScope();
  const userId = isAdmin ? selectedUserId ?? user?.UserID : user?.UserID;

  const [filterYear, setFilterYear] = useState(currentYear);
  const [filterMonth, setFilterMonth] = useState(currentMonth);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [selectedBudgetId, setSelectedBudgetId] = useState<number | null>(null);

  const [form, setForm] = useState({
    categoryId: 0,
    plannedAmount: "",
    warningPercent: "80"
  });

  const categoriesQuery = useQuery({ queryKey: ["categories"], queryFn: getMetaCategories });
  
  const plansQuery = useQuery({
    queryKey: ["budget-plans", userId, filterYear, filterMonth],
    queryFn: () => getBudgetPlans({ user_id: userId, budget_year: filterYear, budget_month: filterMonth }),
    enabled: Boolean(userId)
  });

  const statusQuery = useQuery({
    queryKey: ["budget-status", userId, filterYear, filterMonth],
    queryFn: () => getBudgetStatus({ user_id: userId, budget_year: filterYear, budget_month: filterMonth }),
    enabled: Boolean(userId)
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createBudgetPlan,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["budget-plans", userId] });
      await queryClient.invalidateQueries({ queryKey: ["budget-status", userId] });
      setIsModalOpen(false);
    },
    onError: (error) => alert(extractApiErrorMessage(error, "Failed to add budget."))
  });

  const updateMutation = useMutation({
    mutationFn: ({ budgetId, payload }: { budgetId: number; payload: Parameters<typeof updateBudgetPlan>[1] }) =>
      updateBudgetPlan(budgetId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["budget-plans", userId] });
      await queryClient.invalidateQueries({ queryKey: ["budget-status", userId] });
      setIsModalOpen(false);
    },
    onError: (error) => alert(extractApiErrorMessage(error, "Failed to update budget."))
  });

  const deleteMutation = useMutation({
    mutationFn: ({ budgetId, uid }: { budgetId: number; uid: number }) => deleteBudgetPlan(budgetId, uid),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["budget-plans", userId] });
      await queryClient.invalidateQueries({ queryKey: ["budget-status", userId] });
    },
    onError: (error) => alert(extractApiErrorMessage(error, "Failed to delete budget."))
  });

  const planRows = plansQuery.data || [];
  const statusRows = statusQuery.data || [];
  const categoryOptions = categoriesQuery.data || [];

  const openAddModal = () => {
    setModalMode("add");
    setForm({ categoryId: 0, plannedAmount: "", warningPercent: "80" });
    setIsModalOpen(true);
  };

  const openEditModal = (planId: number) => {
    const plan = planRows.find(p => p.BudgetID === planId);
    if (plan) {
      setModalMode("edit");
      setSelectedBudgetId(planId);
      
      const strAmount = String(plan.PlannedAmount);
      const parts = strAmount.split(".");
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      
      setForm({
        categoryId: plan.CategoryID,
        plannedAmount: parts.join("."),
        warningPercent: String(plan.WarningPercent)
      });
      setIsModalOpen(true);
    }
  };

  const handleDelete = (planId: number) => {
    if (!userId) return;
    if (window.confirm("Are you sure you want to delete this budget?")) {
      deleteMutation.mutate({ budgetId: planId, uid: userId });
    }
  };

  const handleSave = () => {
    if (!userId || !form.categoryId) {
      alert("Please select a category.");
      return;
    }
    const parsedAmount = Number(form.plannedAmount.replace(/,/g, ""));
    const payload = {
      user_id: userId,
      category_id: form.categoryId,
      budget_year: filterYear,
      budget_month: filterMonth,
      planned_amount: parsedAmount,
      warning_percent: Number(form.warningPercent)
    };

    if (modalMode === "add") {
      createMutation.mutate(payload);
    } else if (modalMode === "edit" && selectedBudgetId) {
      updateMutation.mutate({ budgetId: selectedBudgetId, payload });
    }
  };

  const kpiStats = useMemo(() => {
    let planned = 0;
    let spent = 0;
    statusRows.forEach(row => {
      planned += row.PlannedAmount;
      spent += row.SpentAmount;
    });
    return { planned, spent, remaining: planned - spent };
  }, [statusRows]);

  const activeAlerts = useMemo(() => {
    return statusRows.filter(r => r.AlertLevel === "WARNING" || r.AlertLevel === "EXCEEDED");
  }, [statusRows]);

  const progressData = useMemo(() => {
    const grouped = new Map<string, { CategoryName: string; PlannedAmount: number; SpentAmount: number }>();
    statusRows.forEach(row => {
      const prev = grouped.get(row.CategoryName) || { CategoryName: row.CategoryName, PlannedAmount: 0, SpentAmount: 0 };
      prev.PlannedAmount += row.PlannedAmount;
      prev.SpentAmount += row.SpentAmount;
      grouped.set(row.CategoryName, prev);
    });
    return Array.from(grouped.values());
  }, [statusRows]);

  return (
    <AuthGuard>
      <AppShell title="Budgets" subtitle={`Manage your budget plans`}>
        {plansQuery.isLoading || statusQuery.isLoading ? (
          <LoadingSkeleton label="Loading budgets..." />
        ) : null}

        {/* Header Controls */}
        <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center space-x-3 bg-surface border border-border p-2 rounded-lg shadow-sm">
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(Number(e.target.value))}
              className="focus-ring bg-transparent border-none text-text text-sm font-semibold pr-2 cursor-pointer outline-none"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i + 1} value={i + 1}>Month {i + 1}</option>
              ))}
            </select>
            <span className="text-border">|</span>
            <input
              type="number"
              value={filterYear}
              onChange={(e) => setFilterYear(Number(e.target.value))}
              className="focus-ring bg-transparent border-none text-text text-sm font-semibold w-20 cursor-text outline-none"
            />
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center space-x-2 bg-primary hover:bg-primary/90 text-bg px-4 py-2.5 rounded-lg font-semibold transition-colors shadow-sm"
          >
            <Plus size={18} />
            <span>New Budget</span>
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <KpiCard label="Total Budgeted" value={kpiStats.planned} tone="normal" />
          <KpiCard label="Total Spent" value={kpiStats.spent} tone="warning" />
          <KpiCard label="Remaining Budget" value={kpiStats.remaining} tone={kpiStats.remaining >= 0 ? "success" : "danger"} />
        </div>

        {/* Alerts Banner */}
        {activeAlerts.length > 0 && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
            <h3 className="text-red-800 font-semibold mb-3 flex items-center gap-2">
              <span className="text-lg">🚨</span> Action Required: Budget Alerts
            </h3>
            <div className="space-y-2">
              {activeAlerts.map(alert => (
                <div key={alert.BudgetID} className="flex justify-between items-center text-sm">
                  <span className="text-red-700 font-medium">{alert.CategoryName}</span>
                  <span className="text-red-600">
                    Spent: <span className="font-bold">{formatCurrency(alert.SpentAmount)}</span> / {formatCurrency(alert.PlannedAmount)}
                    <span className="ml-2 uppercase text-xs px-2 py-0.5 rounded-full border border-red-300 bg-red-100">{alert.AlertLevel}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Active Budgets Table/List */}
          <div className="rounded-xl border border-border bg-surface p-5 shadow-sm overflow-hidden flex flex-col min-h-[400px] max-h-[600px]">
            <h2 className="mb-4 text-lg font-semibold tracking-tight text-text">Active Budgets</h2>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {planRows.length === 0 ? (
                <div className="flex h-full items-center justify-center text-muted text-sm">
                  No budgets set for this month.
                </div>
              ) : (
                <div className="space-y-3">
                  {planRows.map(plan => {
                    const status = statusRows.find(s => s.BudgetID === plan.BudgetID);
                    const isExceeded = status?.AlertLevel === "EXCEEDED";
                    
                    return (
                      <div key={plan.BudgetID} className="flex items-center justify-between p-3.5 border border-border rounded-lg bg-bg hover:border-muted transition-colors group">
                        <div>
                          <p className="font-semibold text-text">{plan.CategoryName}</p>
                          <p className="text-xs text-muted mt-1.5 flex gap-3">
                            <span>Budget: <span className="font-medium text-text">{formatCurrency(plan.PlannedAmount)}</span></span>
                            {status && (
                              <span>
                                Spent: <span className={`font-medium ${isExceeded ? "text-red-500" : "text-text"}`}>{formatCurrency(status.SpentAmount)}</span>
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEditModal(plan.BudgetID)} className="p-2 text-muted hover:text-primary bg-surface rounded-md border border-border hover:border-primary transition-colors">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDelete(plan.BudgetID)} className="p-2 text-muted hover:text-red-500 bg-surface rounded-md border border-border hover:border-red-500 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Budget Progress Bars */}
          <div className="min-h-[400px] max-h-[600px] overflow-y-auto custom-scrollbar">
             <BudgetProgressBars title="Budget vs Actual" data={progressData} />
          </div>
        </div>

        {/* Simple Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center p-4 border-b border-border bg-bg">
                <h2 className="text-lg font-semibold tracking-tight text-text">{modalMode === "add" ? "Create Budget" : "Edit Budget"}</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-text p-1 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Category</label>
                  <select
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: Number(e.target.value) })}
                    disabled={modalMode === "edit"}
                    className="w-full focus-ring rounded-lg border border-border bg-bg px-3 py-2.5 text-text text-sm disabled:opacity-50"
                  >
                    <option value={0}>Select a category</option>
                    {categoryOptions.map(cat => (
                      <option key={cat.CategoryID} value={cat.CategoryID}>{cat.CategoryName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Planned Amount</label>
                  <input
                    type="text"
                    value={form.plannedAmount}
                    onChange={(e) => {
                      let rawValue = e.target.value.replace(/[^0-9.]/g, "");
                      const parts = rawValue.split(".");
                      if (parts.length > 2) {
                        rawValue = parts[0] + "." + parts.slice(1).join("");
                      }
                      const finalParts = rawValue.split(".");
                      finalParts[0] = finalParts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                      setForm({ ...form, plannedAmount: finalParts.join(".") });
                    }}
                    className="w-full focus-ring rounded-lg border border-border bg-bg px-3 py-2.5 text-text text-sm"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted mb-1.5">Warning Alert Threshold (%)</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="100"
                    value={form.warningPercent}
                    onChange={(e) => setForm({ ...form, warningPercent: e.target.value })}
                    className="w-full focus-ring rounded-lg border border-border bg-bg px-3 py-2.5 text-text text-sm"
                  />
                  <p className="text-xs text-muted mt-1.5">You will be alerted when spending reaches this percentage.</p>
                </div>
              </div>
              <div className="flex justify-end gap-3 p-4 border-t border-border bg-bg">
                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-text bg-surface border border-border rounded-lg hover:bg-border transition-colors">
                  Cancel
                </button>
                <button onClick={handleSave} className="px-4 py-2 text-sm font-semibold text-bg bg-primary rounded-lg hover:bg-primary/90 transition-colors">
                  {modalMode === "add" ? "Create Budget" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}
      </AppShell>
    </AuthGuard>
  );
}

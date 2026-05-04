"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import {
  createBudgetPlan,
  deleteBudgetPlan,
  getBudgetPlans,
  getBudgetStatus,
  updateBudgetPlan
} from "@/lib/api-client";

export function useBudgetPlansQuery(params: {
  user_id?: number;
  budget_year?: number | null;
  budget_month?: number | null;
}) {
  return useQuery({
    queryKey: ["budget-plans", params.user_id, params.budget_year, params.budget_month],
    queryFn: () => getBudgetPlans(params),
    enabled: Boolean(params.user_id)
  });
}

export function useBudgetStatusQuery(params: {
  user_id?: number;
  budget_year?: number | null;
  budget_month?: number | null;
}) {
  return useQuery({
    queryKey: ["budget-status", params.user_id, params.budget_year, params.budget_month],
    queryFn: () => getBudgetStatus(params),
    enabled: Boolean(params.user_id)
  });
}

export function useCreateBudgetMutation() {
  return useMutation({ mutationFn: createBudgetPlan });
}

export function useUpdateBudgetMutation() {
  return useMutation({
    mutationFn: ({ budgetId, payload }: { budgetId: number; payload: Parameters<typeof updateBudgetPlan>[1] }) =>
      updateBudgetPlan(budgetId, payload)
  });
}

export function useDeleteBudgetMutation() {
  return useMutation({
    mutationFn: ({ budgetId, userId }: { budgetId: number; userId: number }) =>
      deleteBudgetPlan(budgetId, userId)
  });
}


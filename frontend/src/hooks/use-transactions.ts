"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import {
  createExpense,
  createIncome,
  deleteExpense,
  deleteIncome,
  getExpenseById,
  getExpenses,
  getIncomeById,
  getIncomes,
  getTransactions,
  updateExpense,
  updateIncome
} from "@/lib/api-client";

export function useTransactionsQuery(userId?: number, accountId?: number | null) {
  return useQuery({
    queryKey: ["transactions", userId, accountId],
    queryFn: () => getTransactions({ user_id: userId, account_id: accountId }),
    enabled: Boolean(userId)
  });
}

export function useIncomesQuery(userId?: number) {
  return useQuery({
    queryKey: ["incomes", userId],
    queryFn: () => getIncomes(userId),
    enabled: Boolean(userId)
  });
}

export function useIncomeDetailQuery(incomeId?: number) {
  return useQuery({
    queryKey: ["income-detail", incomeId],
    queryFn: () => getIncomeById(Number(incomeId)),
    enabled: Boolean(incomeId)
  });
}

export function useCreateIncomeMutation() {
  return useMutation({ mutationFn: createIncome });
}

export function useUpdateIncomeMutation() {
  return useMutation({
    mutationFn: ({ incomeId, payload }: { incomeId: number; payload: Parameters<typeof updateIncome>[1] }) =>
      updateIncome(incomeId, payload)
  });
}

export function useDeleteIncomeMutation() {
  return useMutation({ mutationFn: deleteIncome });
}

export function useExpensesQuery(userId?: number) {
  return useQuery({
    queryKey: ["expenses", userId],
    queryFn: () => getExpenses(userId),
    enabled: Boolean(userId)
  });
}

export function useExpenseDetailQuery(expenseId?: number) {
  return useQuery({
    queryKey: ["expense-detail", expenseId],
    queryFn: () => getExpenseById(Number(expenseId)),
    enabled: Boolean(expenseId)
  });
}

export function useCreateExpenseMutation() {
  return useMutation({ mutationFn: createExpense });
}

export function useUpdateExpenseMutation() {
  return useMutation({
    mutationFn: ({ expenseId, payload }: { expenseId: number; payload: Parameters<typeof updateExpense>[1] }) =>
      updateExpense(expenseId, payload)
  });
}

export function useDeleteExpenseMutation() {
  return useMutation({ mutationFn: deleteExpense });
}


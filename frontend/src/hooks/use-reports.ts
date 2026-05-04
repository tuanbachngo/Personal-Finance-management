"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getBalanceHistory,
  getCategorySpending,
  getDailySummary,
  getMonthlySummary,
  getSpendingAlerts,
  getYearlySummary
} from "@/lib/api-client";

export function useMonthlySummaryQuery(userId?: number) {
  return useQuery({
    queryKey: ["report-monthly", userId],
    queryFn: () => getMonthlySummary(userId),
    enabled: Boolean(userId)
  });
}

export function useYearlySummaryQuery(userId?: number) {
  return useQuery({
    queryKey: ["report-yearly", userId],
    queryFn: () => getYearlySummary(userId),
    enabled: Boolean(userId)
  });
}

export function useDailySummaryQuery(params: {
  user_id?: number;
  start_date?: string | null;
  end_date?: string | null;
  account_id?: number | null;
  category_id?: number | null;
}) {
  return useQuery({
    queryKey: [
      "report-daily",
      params.user_id,
      params.start_date,
      params.end_date,
      params.account_id,
      params.category_id
    ],
    queryFn: () => getDailySummary(params),
    enabled: Boolean(params.user_id)
  });
}

export function useCategorySpendingQuery(userId?: number) {
  return useQuery({
    queryKey: ["report-category-spending", userId],
    queryFn: () => getCategorySpending(userId),
    enabled: Boolean(userId)
  });
}

export function useSpendingAlertsQuery(userId?: number) {
  return useQuery({
    queryKey: ["report-alerts", userId],
    queryFn: () => getSpendingAlerts(userId),
    enabled: Boolean(userId)
  });
}

export function useBalanceHistoryQuery(params: { user_id?: number; account_id?: number | null }) {
  return useQuery({
    queryKey: ["report-balance-history", params.user_id, params.account_id],
    queryFn: () => getBalanceHistory(params),
    enabled: Boolean(params.user_id)
  });
}


import axios, { AxiosError } from "axios";

import type {
  AccountInfo,
  ApiMessageResponse,
  BalanceHistoryRecord,
  BankInfo,
  BudgetCreateRequest,
  BudgetPlanRecord,
  BudgetStatusRecord,
  BudgetUpdateRequest,
  CategoryInfo,
  CategorySpendingPoint,
  CreateEntityResponse,
  DailySummaryPoint,
  DashboardOverviewResponse,
  ExpenseCreateRequest,
  ExpenseRecord,
  ExpenseUpdateRequest,
  IncomeCreateRequest,
  IncomeRecord,
  IncomeUpdateRequest,
  LoginRequest,
  LoginResponse,
  MonthlyTrendPoint,
  OtpRequest,
  OtpVerifyRequest,
  PasswordResetConfirmRequest,
  RecoveryHintResponse,
  SignupRequest,
  SpendingAlert,
  TransactionRecord,
  UserBasic,
  UserProfileCreateRequest,
  UserProfileRecord,
  UserProfileUpdateRequest,
  YearlySummaryPoint
} from "@/types/api";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://localhost:8000/api/v1";

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 20000
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("pf_access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export function extractApiErrorMessage(error: unknown, fallback = "Request failed."): string {
  if (error instanceof AxiosError) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
  }
  return fallback;
}

export async function login(payload: LoginRequest): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>("/auth/login", payload);
  return response.data;
}

export async function logout(): Promise<ApiMessageResponse> {
  const response = await apiClient.post<ApiMessageResponse>("/auth/logout");
  return response.data;
}

export async function me(): Promise<LoginResponse["user"]> {
  const response = await apiClient.get<LoginResponse["user"]>("/auth/me");
  return response.data;
}

export async function signup(payload: SignupRequest): Promise<ApiMessageResponse> {
  const response = await apiClient.post<ApiMessageResponse>("/auth/signup", payload);
  return response.data;
}

export async function requestUnlockOtp(payload: OtpRequest): Promise<ApiMessageResponse> {
  const response = await apiClient.post<ApiMessageResponse>("/auth/otp/unlock/request", payload);
  return response.data;
}

export async function verifyUnlockOtp(payload: OtpVerifyRequest): Promise<ApiMessageResponse> {
  const response = await apiClient.post<ApiMessageResponse>("/auth/otp/unlock/verify", payload);
  return response.data;
}

export async function getRecoveryHint(email: string): Promise<RecoveryHintResponse> {
  const response = await apiClient.get<RecoveryHintResponse>("/auth/recovery-hint", {
    params: { email }
  });
  return response.data;
}

export async function requestPasswordReset(payload: OtpRequest): Promise<ApiMessageResponse> {
  const response = await apiClient.post<ApiMessageResponse>("/auth/password/reset/request", payload);
  return response.data;
}

export async function confirmPasswordReset(
  payload: PasswordResetConfirmRequest
): Promise<ApiMessageResponse> {
  const response = await apiClient.post<ApiMessageResponse>("/auth/password/reset/confirm", payload);
  return response.data;
}

export async function getDashboardOverview(userId?: number): Promise<DashboardOverviewResponse> {
  const response = await apiClient.get<DashboardOverviewResponse>("/dashboard/overview", {
    params: { user_id: userId }
  });
  return response.data;
}

export async function getMetaUsers(): Promise<UserBasic[]> {
  const response = await apiClient.get<UserBasic[]>("/meta/users");
  return response.data;
}

export async function getMetaAccounts(userId?: number): Promise<AccountInfo[]> {
  const response = await apiClient.get<AccountInfo[]>("/meta/accounts", {
    params: { user_id: userId }
  });
  return response.data;
}

export async function getMetaCategories(): Promise<CategoryInfo[]> {
  const response = await apiClient.get<CategoryInfo[]>("/meta/categories");
  return response.data;
}

export async function getMetaBanks(): Promise<BankInfo[]> {
  const response = await apiClient.get<BankInfo[]>("/meta/banks");
  return response.data;
}

export async function getTransactions(params: {
  user_id?: number;
  account_id?: number | null;
}): Promise<TransactionRecord[]> {
  const response = await apiClient.get<TransactionRecord[]>("/transactions", { params });
  return response.data;
}

export async function getIncomes(userId?: number): Promise<IncomeRecord[]> {
  const response = await apiClient.get<IncomeRecord[]>("/incomes", {
    params: { user_id: userId }
  });
  return response.data;
}

export async function getIncomeById(incomeId: number): Promise<IncomeRecord> {
  const response = await apiClient.get<IncomeRecord>(`/incomes/${incomeId}`);
  return response.data;
}

export async function createIncome(payload: IncomeCreateRequest): Promise<ApiMessageResponse> {
  const response = await apiClient.post<ApiMessageResponse>("/incomes", payload);
  return response.data;
}

export async function updateIncome(
  incomeId: number,
  payload: IncomeUpdateRequest
): Promise<ApiMessageResponse> {
  const response = await apiClient.put<ApiMessageResponse>(`/incomes/${incomeId}`, payload);
  return response.data;
}

export async function deleteIncome(incomeId: number): Promise<ApiMessageResponse> {
  const response = await apiClient.delete<ApiMessageResponse>(`/incomes/${incomeId}`);
  return response.data;
}

export async function getExpenses(userId?: number): Promise<ExpenseRecord[]> {
  const response = await apiClient.get<ExpenseRecord[]>("/expenses", {
    params: { user_id: userId }
  });
  return response.data;
}

export async function getExpenseById(expenseId: number): Promise<ExpenseRecord> {
  const response = await apiClient.get<ExpenseRecord>(`/expenses/${expenseId}`);
  return response.data;
}

export async function createExpense(payload: ExpenseCreateRequest): Promise<ApiMessageResponse> {
  const response = await apiClient.post<ApiMessageResponse>("/expenses", payload);
  return response.data;
}

export async function updateExpense(
  expenseId: number,
  payload: ExpenseUpdateRequest
): Promise<ApiMessageResponse> {
  const response = await apiClient.put<ApiMessageResponse>(`/expenses/${expenseId}`, payload);
  return response.data;
}

export async function deleteExpense(expenseId: number): Promise<ApiMessageResponse> {
  const response = await apiClient.delete<ApiMessageResponse>(`/expenses/${expenseId}`);
  return response.data;
}

export async function getMonthlySummary(userId?: number): Promise<MonthlyTrendPoint[]> {
  const response = await apiClient.get<MonthlyTrendPoint[]>("/reports/monthly", {
    params: { user_id: userId }
  });
  return response.data;
}

export async function getYearlySummary(userId?: number): Promise<YearlySummaryPoint[]> {
  const response = await apiClient.get<YearlySummaryPoint[]>("/reports/yearly", {
    params: { user_id: userId }
  });
  return response.data;
}

export async function getDailySummary(params: {
  user_id?: number;
  start_date?: string | null;
  end_date?: string | null;
  account_id?: number | null;
  category_id?: number | null;
}): Promise<DailySummaryPoint[]> {
  const response = await apiClient.get<DailySummaryPoint[]>("/reports/daily", { params });
  return response.data;
}

export async function getCategorySpending(userId?: number): Promise<CategorySpendingPoint[]> {
  const response = await apiClient.get<CategorySpendingPoint[]>("/reports/category-spending", {
    params: { user_id: userId }
  });
  return response.data;
}

export async function getBudgetPlans(params: {
  user_id?: number;
  budget_year?: number | null;
  budget_month?: number | null;
}): Promise<BudgetPlanRecord[]> {
  const response = await apiClient.get<BudgetPlanRecord[]>("/budgets/plans", { params });
  return response.data;
}

export async function createBudgetPlan(payload: BudgetCreateRequest): Promise<ApiMessageResponse> {
  const response = await apiClient.post<ApiMessageResponse>("/budgets/plans", payload);
  return response.data;
}

export async function updateBudgetPlan(
  budgetId: number,
  payload: BudgetUpdateRequest
): Promise<ApiMessageResponse> {
  const response = await apiClient.put<ApiMessageResponse>(`/budgets/plans/${budgetId}`, payload);
  return response.data;
}

export async function deleteBudgetPlan(
  budgetId: number,
  userId: number
): Promise<ApiMessageResponse> {
  const response = await apiClient.delete<ApiMessageResponse>(`/budgets/plans/${budgetId}`, {
    params: { user_id: userId }
  });
  return response.data;
}

export async function getBudgetStatus(params: {
  user_id?: number;
  budget_year?: number | null;
  budget_month?: number | null;
}): Promise<BudgetStatusRecord[]> {
  const response = await apiClient.get<BudgetStatusRecord[]>("/budgets/status", { params });
  return response.data;
}

export async function getSpendingAlerts(userId?: number): Promise<SpendingAlert[]> {
  const response = await apiClient.get<SpendingAlert[]>("/alerts/spending", {
    params: { user_id: userId }
  });
  return response.data;
}

export async function getBalanceHistory(params: {
  user_id?: number;
  account_id?: number | null;
}): Promise<BalanceHistoryRecord[]> {
  const response = await apiClient.get<BalanceHistoryRecord[]>("/balance-history", { params });
  return response.data;
}

export async function getUserProfiles(): Promise<UserProfileRecord[]> {
  const response = await apiClient.get<UserProfileRecord[]>("/users/profiles");
  return response.data;
}

export async function createUserProfile(
  payload: UserProfileCreateRequest
): Promise<CreateEntityResponse> {
  const response = await apiClient.post<CreateEntityResponse>("/users/profiles", payload);
  return response.data;
}

export async function updateUserProfile(
  userId: number,
  payload: UserProfileUpdateRequest
): Promise<ApiMessageResponse> {
  const response = await apiClient.put<ApiMessageResponse>(`/users/profiles/${userId}`, payload);
  return response.data;
}

export async function deleteUserProfile(userId: number): Promise<ApiMessageResponse> {
  const response = await apiClient.delete<ApiMessageResponse>(`/users/profiles/${userId}`);
  return response.data;
}

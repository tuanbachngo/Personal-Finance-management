import axios, { AxiosError } from "axios";

import type {
  AccountInfo,
  ApiMessageResponse,
  BalanceHistoryRecord,
  BankInfo,
  BudgetCreateRequest,
  BudgetOverviewResponse,
  BudgetPlanRecord,
  BudgetSettingsRequest,
  BudgetSettingsResponse,
  BudgetStatusRecord,
  BudgetUpdateRequest,
  CanISpendRequest,
  CanISpendResponse,
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
  PasswordChangeRequest,
  ProfileUpdateRequest,
  RecoveryHintResponse,
  SignupRequest,
  SpendingAlert,
  TransactionRecord,
  UserBasic,
  UserProfileCreateRequest,
  UserProfileRecord,
  UserProfileUpdateRequest,
  YearlySummaryPoint,
  GoalContributionCreateRequest,
  GoalContributionRecord,
  GoalCreateRequest,
  GoalProgressRecord,
  GoalRecord,
  GoalUpdateRequest,
  ImportConfirmRequest,
  ImportConfirmResponse,
  ImportHistoryRecord,
  ImportPreviewResponse,
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

export async function updateOwnProfile(
  payload: ProfileUpdateRequest
): Promise<ApiMessageResponse> {
  const response = await apiClient.put<ApiMessageResponse>("/auth/profile", payload);
  return response.data;
}

export async function changeOwnPassword(
  payload: PasswordChangeRequest
): Promise<ApiMessageResponse> {
  const response = await apiClient.post<ApiMessageResponse>("/auth/password/change", payload);
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

export async function getGoals(userId?: number): Promise<GoalRecord[]> {
  const response = await apiClient.get<GoalRecord[]>("/goals", {
    params: { user_id: userId }
  });
  return response.data;
}

export async function getGoalProgress(userId?: number): Promise<GoalProgressRecord[]> {
  const response = await apiClient.get<GoalProgressRecord[]>("/goals/progress", {
    params: { user_id: userId }
  });
  return response.data;
}

export async function createGoal(payload: GoalCreateRequest): Promise<CreateEntityResponse> {
  const response = await apiClient.post<CreateEntityResponse>("/goals", payload);
  return response.data;
}

export async function updateGoal(
  goalId: number,
  payload: GoalUpdateRequest
): Promise<ApiMessageResponse> {
  const response = await apiClient.put<ApiMessageResponse>(`/goals/${goalId}`, payload);
  return response.data;
}

export async function deleteGoal(
  goalId: number,
  userId: number
): Promise<ApiMessageResponse> {
  const response = await apiClient.delete<ApiMessageResponse>(`/goals/${goalId}`, {
    params: { user_id: userId }
  });
  return response.data;
}

export async function getGoalContributions(
  goalId: number,
  userId: number
): Promise<GoalContributionRecord[]> {
  const response = await apiClient.get<GoalContributionRecord[]>(
    `/goals/${goalId}/contributions`,
    {
      params: { user_id: userId }
    }
  );
  return response.data;
}

export async function createGoalContribution(
  goalId: number,
  payload: GoalContributionCreateRequest
): Promise<CreateEntityResponse> {
  const response = await apiClient.post<CreateEntityResponse>(
    `/goals/${goalId}/contributions`,
    payload
  );
  return response.data;
}

export async function getBudgetSettings(params: {
  user_id?: number;
  budget_year?: number | null;
  budget_month?: number | null;
}): Promise<BudgetSettingsResponse> {
  const response = await apiClient.get<BudgetSettingsResponse>("/budgets/settings", { params });
  return response.data;
}

export async function upsertBudgetSettings(
  payload: BudgetSettingsRequest
): Promise<BudgetSettingsResponse> {
  const response = await apiClient.put<BudgetSettingsResponse>("/budgets/settings", payload);
  return response.data;
}

export async function getBudgetOverview(params: {
  user_id?: number;
  budget_year?: number | null;
  budget_month?: number | null;
}): Promise<BudgetOverviewResponse> {
  const response = await apiClient.get<BudgetOverviewResponse>("/budgets/overview", { params });
  return response.data;
}

export async function canISpend(payload: CanISpendRequest): Promise<CanISpendResponse> {
  const response = await apiClient.post<CanISpendResponse>("/budgets/can-i-spend", payload);
  return response.data;
}

export async function previewTransactionImport(params: {
  file: File;
  account_id: number;
  user_id?: number;
}): Promise<ImportPreviewResponse> {
  const formData = new FormData();
  formData.append("file", params.file);
  formData.append("account_id", String(params.account_id));
  if (params.user_id !== undefined) {
    formData.append("user_id", String(params.user_id));
  }

  const response = await apiClient.post<ImportPreviewResponse>(
    "/imports/transactions/preview",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    }
  );
  return response.data;
}

export async function confirmTransactionImport(
  payload: ImportConfirmRequest
): Promise<ImportConfirmResponse> {
  const response = await apiClient.post<ImportConfirmResponse>(
    "/imports/transactions/confirm",
    payload
  );
  return response.data;
}

export async function getImportHistory(userId?: number): Promise<ImportHistoryRecord[]> {
  const response = await apiClient.get<ImportHistoryRecord[]>("/imports/transactions/history", {
    params: { user_id: userId }
  });
  return response.data;
}

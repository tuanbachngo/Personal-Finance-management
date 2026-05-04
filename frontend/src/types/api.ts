export type ApiMessageResponse = {
  message: string;
};

export type CreateEntityResponse = {
  message: string;
  id: number;
};

export type AuthUser = {
  UserID: number;
  UserName: string;
  Email: string;
  PhoneNumber: string | null;
  UserRole: string;
  IsActive: number;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  access_token: string;
  token_type: "bearer";
  user: AuthUser;
};

export type SignupRequest = {
  user_name: string;
  email: string;
  phone_number?: string | null;
  bank_id: number;
  password: string;
  recovery_hint?: string | null;
  recovery_answer?: string | null;
};

export type OtpRequest = {
  email: string;
};

export type OtpVerifyRequest = {
  email: string;
  otp_code: string;
};

export type PasswordResetConfirmRequest = {
  email: string;
  otp_code: string;
  recovery_answer: string;
  new_password: string;
};

export type RecoveryHintResponse = {
  recovery_hint: string | null;
};

export type UserBasic = {
  UserID: number;
  UserName: string;
  Email: string;
  PhoneNumber: string | null;
};

export type BankInfo = {
  BankID: number;
  BankCode: string;
  BankName: string;
  IsActive: number;
};

export type AccountInfo = {
  AccountID: number;
  UserID: number;
  BankID: number;
  BankCode: string;
  BankName: string;
  Balance: number;
};

export type CategoryInfo = {
  CategoryID: number;
  CategoryName: string;
};

export type TransactionRecord = {
  TransactionType: "INCOME" | "EXPENSE" | string;
  TransactionID: number;
  UserID: number;
  AccountID: number;
  CategoryID: number | null;
  Amount: number;
  TransactionDate: string;
  Description: string | null;
};

export type IncomeRecord = {
  IncomeID: number;
  UserID: number;
  AccountID: number;
  Amount: number;
  IncomeDate: string;
  Description: string | null;
};

export type ExpenseRecord = {
  ExpenseID: number;
  UserID: number;
  AccountID: number;
  CategoryID: number;
  Amount: number;
  ExpenseDate: string;
  Description: string | null;
};

export type IncomeCreateRequest = {
  user_id: number;
  account_id: number;
  amount: number;
  description?: string;
};

export type IncomeUpdateRequest = IncomeCreateRequest;

export type ExpenseCreateRequest = {
  user_id: number;
  account_id: number;
  category_id: number;
  amount: number;
  description?: string;
};

export type ExpenseUpdateRequest = ExpenseCreateRequest;

export type FinancialSummary = {
  TotalIncome: number;
  TotalExpense: number;
  NetSaving: number;
};

export type MonthlyTrendPoint = {
  YearMonth: string;
  MonthlyIncome: number;
  MonthlyExpense: number;
  NetSaving: number;
};

export type YearlySummaryPoint = {
  ReportYear: number;
  YearlyIncome: number;
  YearlyExpense: number;
  NetSaving: number;
};

export type DailySummaryPoint = {
  SummaryDate: string;
  DailyIncome: number;
  DailyExpense: number;
  NetSaving: number;
};

export type CategorySpendingPoint = {
  CategoryID: number;
  CategoryName: string;
  TotalSpent: number;
  TotalTransactions: number;
};

export type BudgetPlanRecord = {
  BudgetID: number;
  UserID: number;
  UserName: string;
  CategoryID: number;
  CategoryName: string;
  BudgetYear: number;
  BudgetMonth: number;
  PlannedAmount: number;
  WarningPercent: number;
  CreatedAt: string | null;
};

export type BudgetStatusRecord = {
  BudgetID: number;
  UserID: number;
  UserName: string;
  CategoryID: number;
  CategoryName: string;
  BudgetYear: number;
  BudgetMonth: number;
  PlannedAmount: number;
  WarningPercent: number;
  SpentAmount: number;
  RemainingBudget: number;
  AlertLevel: string;
};

export type BudgetCreateRequest = {
  user_id: number;
  category_id: number;
  budget_year: number;
  budget_month: number;
  planned_amount: number;
  warning_percent: number;
};

export type BudgetUpdateRequest = BudgetCreateRequest;

export type SpendingAlert = {
  BudgetID: number;
  UserID: number;
  UserName: string;
  CategoryID: number;
  CategoryName: string;
  BudgetYear: number;
  BudgetMonth: number;
  PlannedAmount: number;
  WarningPercent: number;
  SpentAmount: number;
  RemainingBudget: number;
  AlertLevel: string;
};

export type BalanceHistoryRecord = {
  UserID: number;
  UserName: string;
  AccountID: number;
  BankName: string;
  TransactionDate: string;
  TransactionType: string;
  ReferenceID: number;
  AmountSigned: number;
  RunningBalance: number;
};

export type DashboardOverviewResponse = {
  summary: FinancialSummary;
  monthly_trend: MonthlyTrendPoint[];
  alerts: SpendingAlert[];
};

export type UserProfileRecord = {
  UserID: number;
  UserName: string;
  Email: string;
  PhoneNumber: string | null;
  HasCredentials: number;
  UserRole: string;
  IsActive: number;
  LastLoginAt: string | null;
};

export type UserProfileCreateRequest = {
  user_name: string;
  email: string;
  phone_number?: string | null;
  password: string;
  bank_id: number;
  user_role?: string;
  recovery_hint?: string | null;
  recovery_answer?: string | null;
};

export type UserProfileUpdateRequest = {
  user_name: string;
  email: string;
  phone_number?: string | null;
  new_password?: string | null;
  user_role?: string | null;
  is_active?: number | null;
  recovery_hint?: string | null;
  recovery_answer?: string | null;
};


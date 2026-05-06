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

export type ProfileUpdateRequest = {
  user_name: string;
  email: string;
  phone_number?: string | null;
};

export type PasswordChangeRequest = {
  current_password: string;
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
  CategoryName?: string | null;
  BankName?: string | null;
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
  transaction_date?: string | null;
  description?: string;
};

export type IncomeUpdateRequest = IncomeCreateRequest;

export type ExpenseCreateRequest = {
  user_id: number;
  account_id: number;
  category_id: number;
  amount: number;
  transaction_date?: string | null;
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
  IsSoftLocked: number;
  BudgetPriority: "LOW" | "MEDIUM" | "HIGH" | string;
  Notes: string | null;
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
  is_soft_locked?: number;
  budget_priority?: "LOW" | "MEDIUM" | "HIGH" | string;
  notes?: string | null;
};

export type BudgetUpdateRequest = BudgetCreateRequest;

export type FixedExpenseItem = {
  item_name: string;
  amount: number;
};

export type BudgetSettingsRequest = {
  user_id: number;
  budget_year: number;
  budget_month: number;
  expected_income: number;
  fixed_expense_estimate: number;
  goal_contribution_target: number;
  emergency_buffer: number;
  fixed_expense_items: FixedExpenseItem[];
};

export type BudgetSettingsResponse = {
  user_id: number;
  budget_year: number;
  budget_month: number;
  expected_income: number;
  fixed_expense_estimate: number;
  fixed_expense_items: FixedExpenseItem[];
  goal_contribution_target: number;
  emergency_buffer: number;
  available_to_budget: number;
  total_planned_budget: number;
  remaining_to_allocate: number;
  budget_health: "HEALTHY" | "CAUTION" | "RISKY" | "OVERPLANNED" | string;
  created_at: string | null;
  updated_at: string | null;
};

export type BudgetCategoryGuardrail = {
  budget_id: number;
  category_id: number;
  category_name: string;
  planned_amount: number;
  spent_amount: number;
  remaining_budget: number;
  warning_percent: number;
  alert_level: string;
  safe_daily_spend: number;
  safe_weekly_spend: number;
  days_left_in_month: number;
  spending_pace_status: "ON_TRACK" | "WATCH" | "OVER_PACE" | "EXCEEDED" | string;
  usage_percent: number;
  is_soft_locked: number;
  budget_priority: "LOW" | "MEDIUM" | "HIGH" | string;
  notes: string | null;
  historical_average_spent: number;
};

export type BudgetOverviewResponse = {
  user_id: number;
  budget_year: number;
  budget_month: number;
  expected_income: number;
  fixed_expense_estimate: number;
  fixed_expense_items: FixedExpenseItem[];
  goal_contribution_target: number;
  emergency_buffer: number;
  available_to_budget: number;
  total_planned_budget: number;
  remaining_to_allocate: number;
  total_spent: number;
  remaining_budget: number;
  budget_health: "HEALTHY" | "CAUTION" | "RISKY" | "OVERPLANNED" | string;
  warnings: string[];
  categories: BudgetCategoryGuardrail[];
  created_at: string | null;
  updated_at: string | null;
};

export type CanISpendRequest = {
  user_id: number;
  category_id: number;
  amount: number;
  budget_year: number;
  budget_month: number;
};

export type CanISpendResponse = {
  decision: "SAFE" | "CAUTION" | "EXCEEDS_BUDGET" | "SOFT_LOCKED" | string;
  message: string;
  remaining_before: number;
  remaining_after: number;
  safe_daily_spend: number;
  usage_percent_after: number | null;
  requires_confirmation: boolean;
};

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

export type GoalRecord = {
  GoalID: number;
  UserID: number;
  LinkedAccountID: number | null;
  GoalName: string;
  GoalType: string;
  TargetAmount: number;
  CurrentAmount: number;
  StartDate: string;
  TargetDate: string | null;
  AnnualGrowthRate: number;
  Status: string;
  Notes: string | null;
  CreatedAt: string | null;
};

export type GoalProgressRecord = {
  GoalID: number;
  UserID: number;
  UserName: string;
  LinkedAccountID: number | null;
  BankName: string | null;
  GoalName: string;
  GoalType: string;
  TargetAmount: number;
  CurrentAmount: number;
  RemainingAmount: number;
  ProgressPercent: number;
  StartDate: string;
  TargetDate: string | null;
  DaysRemaining: number | null;
  MonthlyRequired: number | null;
  AnnualGrowthRate: number;
  Status: string;
  GoalAlertLevel: string;
  Notes: string | null;
  CreatedAt: string | null;
};

export type GoalCreateRequest = {
  user_id: number;
  linked_account_id?: number | null;
  goal_name: string;
  goal_type: string;
  target_amount: number;
  current_amount?: number;
  start_date?: string | null;
  target_date?: string | null;
  annual_growth_rate?: number;
  status?: string;
  notes?: string | null;
};

export type GoalUpdateRequest = {
  user_id: number;
  linked_account_id?: number | null;
  goal_name: string;
  goal_type: string;
  target_amount: number;
  current_amount: number;
  start_date?: string | null;
  target_date?: string | null;
  annual_growth_rate?: number;
  status: string;
  notes?: string | null;
};

export type GoalContributionRecord = {
  ContributionID: number;
  GoalID: number;
  UserID: number;
  AccountID: number | null;
  Amount: number;
  ContributionType: string;
  ContributionDate: string;
  Description: string | null;
  CreatedAt: string | null;
};

export type GoalContributionCreateRequest = {
  user_id: number;
  account_id?: number | null;
  amount: number;
  contribution_type: string;
  contribution_date?: string | null;
  description?: string | null;
};

export type ImportPreviewRow = {
  row_id: number;
  row_number: number;
  raw_date: string | null;
  raw_description: string | null;
  raw_amount: string | null;
  raw_type: string | null;
  parsed_date: string | null;
  parsed_amount: number | null;
  parsed_type: "INCOME" | "EXPENSE" | string | null;
  suggested_category_id: number | null;
  suggested_category_name: string | null;
  is_duplicate: number;
  action: "IMPORT" | "SKIP" | string;
  error_message: string | null;
};

export type ImportPreviewResponse = {
  batch_id: number;
  status: string;
  total_rows: number;
  rows: ImportPreviewRow[];
};

export type ImportConfirmRowUpdate = {
  row_id: number;
  action: "IMPORT" | "SKIP";
  final_category_id?: number | null;
};

export type ImportConfirmRequest = {
  batch_id: number;
  user_id?: number;
  rows: ImportConfirmRowUpdate[];
};

export type ImportConfirmResponse = {
  message: string;
  batch_id: number;
  imported_rows: number;
  skipped_rows: number;
  failed_rows: number;
};

export type ImportHistoryRecord = {
  batch_id: number;
  user_id: number;
  account_id: number;
  bank_name: string | null;
  file_name: string | null;
  file_type: string | null;
  status: string;
  total_rows: number;
  imported_rows: number;
  skipped_rows: number;
  failed_rows: number;
  created_at: string;
  confirmed_at: string | null;
};


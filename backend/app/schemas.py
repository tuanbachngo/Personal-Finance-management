"""Pydantic schemas for API endpoints."""

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


class ApiMessageResponse(BaseModel):
    message: str


class CreateEntityResponse(BaseModel):
    message: str
    id: int


class AuthUser(BaseModel):
    UserID: int
    UserName: str
    Email: str
    PhoneNumber: str | None = None
    UserRole: str
    IsActive: int


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=255)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AuthUser


class SignupRequest(BaseModel):
    user_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    phone_number: str | None = Field(default=None, max_length=20)
    bank_id: int
    password: str = Field(min_length=1, max_length=255)
    recovery_hint: str | None = Field(default=None, max_length=255)
    recovery_answer: str | None = Field(default=None, max_length=255)


class OtpRequest(BaseModel):
    email: EmailStr


class OtpVerifyRequest(BaseModel):
    email: EmailStr
    otp_code: str = Field(min_length=1, max_length=10)


class PasswordResetConfirmRequest(BaseModel):
    email: EmailStr
    otp_code: str = Field(min_length=1, max_length=10)
    recovery_answer: str = Field(min_length=1, max_length=255)
    new_password: str = Field(min_length=1, max_length=255)


class ProfileUpdateRequest(BaseModel):
    user_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    phone_number: str | None = Field(default=None, max_length=20)


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=255)
    new_password: str = Field(min_length=1, max_length=255)


class RecoveryHintResponse(BaseModel):
    recovery_hint: str | None = None


class UserBasic(BaseModel):
    UserID: int
    UserName: str
    Email: str
    PhoneNumber: str | None = None


class BankInfo(BaseModel):
    BankID: int
    BankCode: str
    BankName: str
    IsActive: int


class AccountInfo(BaseModel):
    AccountID: int
    UserID: int
    BankID: int
    BankCode: str
    BankName: str
    Balance: float


class CategoryInfo(BaseModel):
    CategoryID: int
    CategoryName: str


class TransactionRecord(BaseModel):
    TransactionType: str
    TransactionID: int
    UserID: int
    AccountID: int
    CategoryID: int | None = None
    CategoryName: str | None = None
    BankName: str | None = None
    Amount: float
    TransactionDate: datetime
    Description: str | None = None


class IncomeRecord(BaseModel):
    IncomeID: int
    UserID: int
    AccountID: int
    Amount: float
    IncomeDate: datetime
    Description: str | None = None


class ExpenseRecord(BaseModel):
    ExpenseID: int
    UserID: int
    AccountID: int
    CategoryID: int
    Amount: float
    ExpenseDate: datetime
    Description: str | None = None


class IncomeCreateRequest(BaseModel):
    user_id: int
    account_id: int
    amount: float = Field(gt=0)
    transaction_date: date | None = None
    description: str = ""


class IncomeUpdateRequest(BaseModel):
    user_id: int
    account_id: int
    amount: float = Field(gt=0)
    transaction_date: date | None = None
    description: str = ""


class ExpenseCreateRequest(BaseModel):
    user_id: int
    account_id: int
    category_id: int
    amount: float = Field(gt=0)
    transaction_date: date | None = None
    description: str = ""


class ExpenseUpdateRequest(BaseModel):
    user_id: int
    account_id: int
    category_id: int
    amount: float = Field(gt=0)
    transaction_date: date | None = None
    description: str = ""


class ImportPreviewRow(BaseModel):
    row_id: int
    row_number: int
    raw_date: str | None = None
    raw_description: str | None = None
    raw_amount: str | None = None
    raw_type: str | None = None
    parsed_date: date | None = None
    parsed_amount: float | None = None
    parsed_type: str | None = None
    suggested_category_id: int | None = None
    suggested_category_name: str | None = None
    is_duplicate: int
    action: str
    error_message: str | None = None


class ImportPreviewResponse(BaseModel):
    batch_id: int
    status: str
    total_rows: int
    rows: List[ImportPreviewRow]


class ImportConfirmRowUpdate(BaseModel):
    row_id: int
    action: str = "IMPORT"
    final_category_id: int | None = None


class ImportConfirmRequest(BaseModel):
    batch_id: int
    user_id: int | None = None
    rows: List[ImportConfirmRowUpdate] = Field(default_factory=list)


class ImportConfirmResponse(BaseModel):
    message: str
    batch_id: int
    imported_rows: int
    skipped_rows: int
    failed_rows: int


class ImportHistoryRecord(BaseModel):
    batch_id: int
    user_id: int
    account_id: int
    bank_name: str | None = None
    file_name: str | None = None
    file_type: str | None = None
    status: str
    total_rows: int
    imported_rows: int
    skipped_rows: int
    failed_rows: int
    created_at: datetime
    confirmed_at: datetime | None = None


class FinancialSummary(BaseModel):
    TotalIncome: float
    TotalExpense: float
    NetSaving: float


class MonthlyTrendPoint(BaseModel):
    YearMonth: str
    MonthlyIncome: float
    MonthlyExpense: float
    NetSaving: float


class YearlySummaryPoint(BaseModel):
    ReportYear: int
    YearlyIncome: float
    YearlyExpense: float
    NetSaving: float


class DailySummaryPoint(BaseModel):
    SummaryDate: date
    DailyIncome: float
    DailyExpense: float
    NetSaving: float


class CategorySpendingPoint(BaseModel):
    CategoryID: int
    CategoryName: str
    TotalSpent: float
    TotalTransactions: int


class BudgetPlanRecord(BaseModel):
    BudgetID: int
    UserID: int
    UserName: str
    CategoryID: int
    CategoryName: str
    BudgetYear: int
    BudgetMonth: int
    PlannedAmount: float
    WarningPercent: float
    IsSoftLocked: int = 0
    BudgetPriority: str = "MEDIUM"
    Notes: str | None = None
    CreatedAt: datetime | None = None


class BudgetStatusRecord(BaseModel):
    BudgetID: int
    UserID: int
    UserName: str
    CategoryID: int
    CategoryName: str
    BudgetYear: int
    BudgetMonth: int
    PlannedAmount: float
    WarningPercent: float
    SpentAmount: float
    RemainingBudget: float
    AlertLevel: str


class BudgetCreateRequest(BaseModel):
    user_id: int
    category_id: int
    budget_year: int
    budget_month: int
    planned_amount: float = Field(gt=0)
    warning_percent: float = Field(gt=0, le=100)
    is_soft_locked: int = Field(default=0, ge=0, le=1)
    budget_priority: str = Field(default="MEDIUM", max_length=10)
    notes: str | None = Field(default=None, max_length=255)


class BudgetUpdateRequest(BaseModel):
    user_id: int
    category_id: int
    budget_year: int
    budget_month: int
    planned_amount: float = Field(gt=0)
    warning_percent: float = Field(gt=0, le=100)
    is_soft_locked: int = Field(default=0, ge=0, le=1)
    budget_priority: str = Field(default="MEDIUM", max_length=10)
    notes: str | None = Field(default=None, max_length=255)


class FixedExpenseItem(BaseModel):
    item_name: str = Field(min_length=1, max_length=100)
    amount: float = Field(ge=0)


class BudgetSettingsRequest(BaseModel):
    user_id: int
    budget_year: int
    budget_month: int
    expected_income: float = Field(ge=0)
    fixed_expense_estimate: float = Field(ge=0)
    goal_contribution_target: float = Field(ge=0)
    emergency_buffer: float = Field(ge=0)
    fixed_expense_items: List[FixedExpenseItem] = Field(default_factory=list)


class BudgetCategoryGuardrailRecord(BaseModel):
    budget_id: int
    category_id: int
    category_name: str
    planned_amount: float
    spent_amount: float
    remaining_budget: float
    warning_percent: float
    alert_level: str
    safe_daily_spend: float
    safe_weekly_spend: float
    days_left_in_month: int
    spending_pace_status: str
    usage_percent: float
    is_soft_locked: int
    budget_priority: str
    notes: str | None = None
    historical_average_spent: float = 0.0


class BudgetOverviewResponse(BaseModel):
    user_id: int
    budget_year: int
    budget_month: int
    expected_income: float
    fixed_expense_estimate: float
    fixed_expense_items: List[FixedExpenseItem] = Field(default_factory=list)
    goal_contribution_target: float
    emergency_buffer: float
    available_to_budget: float
    total_planned_budget: float
    remaining_to_allocate: float
    total_spent: float
    remaining_budget: float
    budget_health: str
    warnings: List[str] = Field(default_factory=list)
    categories: List[BudgetCategoryGuardrailRecord] = Field(default_factory=list)
    created_at: datetime | None = None
    updated_at: datetime | None = None


class BudgetSettingsResponse(BaseModel):
    user_id: int
    budget_year: int
    budget_month: int
    expected_income: float
    fixed_expense_estimate: float
    fixed_expense_items: List[FixedExpenseItem] = Field(default_factory=list)
    goal_contribution_target: float
    emergency_buffer: float
    available_to_budget: float
    total_planned_budget: float
    remaining_to_allocate: float
    budget_health: str
    created_at: datetime | None = None
    updated_at: datetime | None = None


class CanISpendRequest(BaseModel):
    user_id: int
    category_id: int
    amount: float = Field(gt=0)
    budget_year: int
    budget_month: int


class CanISpendResponse(BaseModel):
    decision: str
    message: str
    remaining_before: float
    remaining_after: float
    safe_daily_spend: float
    usage_percent_after: float | None = None
    requires_confirmation: bool


class SpendingAlert(BaseModel):
    BudgetID: int
    UserID: int
    UserName: str
    CategoryID: int
    CategoryName: str
    BudgetYear: int
    BudgetMonth: int
    PlannedAmount: float
    WarningPercent: float
    SpentAmount: float
    RemainingBudget: float
    AlertLevel: str


class BalanceHistoryRecord(BaseModel):
    UserID: int
    UserName: str
    AccountID: int
    BankName: str
    TransactionDate: datetime
    TransactionType: str
    ReferenceID: int
    AmountSigned: float
    RunningBalance: float


class DashboardOverviewResponse(BaseModel):
    summary: FinancialSummary
    monthly_trend: List[MonthlyTrendPoint]
    alerts: List[SpendingAlert]


class UserProfileRecord(BaseModel):
    UserID: int
    UserName: str
    Email: str
    PhoneNumber: str | None = None
    HasCredentials: int
    UserRole: str
    IsActive: int
    LastLoginAt: datetime | None = None


class UserProfileCreateRequest(BaseModel):
    user_name: str
    email: EmailStr
    phone_number: str | None = None
    password: str = Field(min_length=1, max_length=255)
    bank_id: int
    user_role: str = "USER"
    recovery_hint: str | None = None
    recovery_answer: str | None = None


class UserProfileUpdateRequest(BaseModel):
    user_name: str
    email: EmailStr
    phone_number: str | None = None
    new_password: str | None = None
    user_role: str | None = None
    is_active: int | None = None
    recovery_hint: str | None = None
    recovery_answer: str | None = None

class GoalRecord(BaseModel):
    GoalID: int
    UserID: int
    LinkedAccountID: int | None = None
    GoalName: str
    GoalType: str
    TargetAmount: float
    CurrentAmount: float
    StartDate: date
    TargetDate: date | None = None
    AnnualGrowthRate: float
    Status: str
    Notes: str | None = None
    CreatedAt: datetime | None = None


class GoalProgressRecord(BaseModel):
    GoalID: int
    UserID: int
    UserName: str
    LinkedAccountID: int | None = None
    BankName: str | None = None
    GoalName: str
    GoalType: str
    TargetAmount: float
    CurrentAmount: float
    RemainingAmount: float
    ProgressPercent: float
    StartDate: date
    TargetDate: date | None = None
    DaysRemaining: int | None = None
    MonthlyRequired: float | None = None
    AnnualGrowthRate: float
    Status: str
    GoalAlertLevel: str
    Notes: str | None = None
    CreatedAt: datetime | None = None


class GoalCreateRequest(BaseModel):
    user_id: int
    linked_account_id: int | None = None
    goal_name: str = Field(min_length=1, max_length=100)
    goal_type: str = "SAVE_UP"
    target_amount: float = Field(gt=0)
    current_amount: float = Field(default=0, ge=0)
    start_date: date | None = None
    target_date: date | None = None
    annual_growth_rate: float = Field(default=0, ge=0)
    status: str = "ACTIVE"
    notes: str | None = Field(default=None, max_length=255)


class GoalUpdateRequest(BaseModel):
    user_id: int
    linked_account_id: int | None = None
    goal_name: str = Field(min_length=1, max_length=100)
    goal_type: str = "SAVE_UP"
    target_amount: float = Field(gt=0)
    current_amount: float = Field(ge=0)
    start_date: date | None = None
    target_date: date | None = None
    annual_growth_rate: float = Field(default=0, ge=0)
    status: str = "ACTIVE"
    notes: str | None = Field(default=None, max_length=255)


class GoalContributionRecord(BaseModel):
    ContributionID: int
    GoalID: int
    UserID: int
    AccountID: int | None = None
    Amount: float
    ContributionType: str
    ContributionDate: date
    Description: str | None = None
    CreatedAt: datetime | None = None


class GoalContributionCreateRequest(BaseModel):
    user_id: int
    account_id: int | None = None
    amount: float = Field(gt=0)
    contribution_type: str = "DEPOSIT"
    contribution_date: date | None = None
    description: str | None = Field(default=None, max_length=255)

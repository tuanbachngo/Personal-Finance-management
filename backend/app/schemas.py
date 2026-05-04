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
    description: str = ""


class IncomeUpdateRequest(BaseModel):
    user_id: int
    account_id: int
    amount: float = Field(gt=0)
    description: str = ""


class ExpenseCreateRequest(BaseModel):
    user_id: int
    account_id: int
    category_id: int
    amount: float = Field(gt=0)
    description: str = ""


class ExpenseUpdateRequest(BaseModel):
    user_id: int
    account_id: int
    category_id: int
    amount: float = Field(gt=0)
    description: str = ""


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


class BudgetUpdateRequest(BaseModel):
    user_id: int
    category_id: int
    budget_year: int
    budget_month: int
    planned_amount: float = Field(gt=0)
    warning_percent: float = Field(gt=0, le=100)


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

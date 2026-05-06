"""
Reporting repository for Personal_Finance.

This repository reads from views/functions and monthly-closure procedure.
"""

from typing import Any, Dict, List, Optional


class ReportRepository:
    def __init__(self, connection) -> None:
        self.connection = connection

    def _fetch_all(self, query: str, params=()) -> List[Dict[str, Any]]:
        cursor = self.connection.cursor(dictionary=True)
        try:
            cursor.execute(query, params)
            return cursor.fetchall()
        finally:
            cursor.close()

    def _fetch_one(self, query: str, params=()) -> Optional[Dict[str, Any]]:
        rows = self._fetch_all(query, params)
        return rows[0] if rows else None

    def _execute(self, query: str, params=()) -> None:
        cursor = self.connection.cursor()
        try:
            cursor.execute(query, params)
            self.connection.commit()
        finally:
            cursor.close()

    def get_total_income_by_user(self) -> List[Dict[str, Any]]:
        return self._fetch_all(
            """
            SELECT UserID, UserName, TotalIncome
            FROM vw_total_income_by_user
            ORDER BY TotalIncome DESC, UserID
            """
        )

    def get_all_categories(self) -> List[Dict[str, Any]]:
        return self._fetch_all(
            """
            SELECT CategoryID, CategoryName
            FROM ExpenseCategories
            ORDER BY CategoryID
            """
        )

    def get_total_expense_by_user(self) -> List[Dict[str, Any]]:
        return self._fetch_all(
            """
            SELECT UserID, UserName, TotalExpense
            FROM vw_total_expense_by_user
            ORDER BY TotalExpense DESC, UserID
            """
        )

    def get_monthly_income_expense_net_saving(self) -> List[Dict[str, Any]]:
        return self._fetch_all(
            """
            SELECT YearMonth, MonthlyIncome, MonthlyExpense, NetSaving
            FROM vw_monthly_income_expense_net_saving
            ORDER BY YearMonth
            """
        )

    def get_daily_income_expense_net_saving(
        self,
        user_id: int,
        start_date: Optional[Any] = None,
        end_date: Optional[Any] = None,
        account_id: Optional[int] = None,
        category_id: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        return self._fetch_all(
            """
            SELECT
                d.SummaryDate,
                SUM(d.TotalIncome) AS DailyIncome,
                SUM(d.TotalExpense) AS DailyExpense,
                SUM(d.TotalIncome) - SUM(d.TotalExpense) AS NetSaving
            FROM (
                SELECT
                    DATE(i.IncomeDate) AS SummaryDate,
                    SUM(i.Amount) AS TotalIncome,
                    0 AS TotalExpense
                FROM Income i
                WHERE i.UserID = %s
                  AND (%s IS NULL OR DATE(i.IncomeDate) >= %s)
                  AND (%s IS NULL OR DATE(i.IncomeDate) <= %s)
                  AND (%s IS NULL OR i.AccountID = %s)
                GROUP BY DATE(i.IncomeDate)

                UNION ALL

                SELECT
                    DATE(e.ExpenseDate) AS SummaryDate,
                    0 AS TotalIncome,
                    SUM(e.Amount) AS TotalExpense
                FROM Expenses e
                WHERE e.UserID = %s
                  AND (%s IS NULL OR DATE(e.ExpenseDate) >= %s)
                  AND (%s IS NULL OR DATE(e.ExpenseDate) <= %s)
                  AND (%s IS NULL OR e.AccountID = %s)
                  AND (%s IS NULL OR e.CategoryID = %s)
                GROUP BY DATE(e.ExpenseDate)
            ) d
            GROUP BY d.SummaryDate
            ORDER BY d.SummaryDate
            """,
            (
                user_id,
                start_date,
                start_date,
                end_date,
                end_date,
                account_id,
                account_id,
                user_id,
                start_date,
                start_date,
                end_date,
                end_date,
                account_id,
                account_id,
                category_id,
                category_id,
            ),
        )

    def get_category_wise_spending(self) -> List[Dict[str, Any]]:
        return self._fetch_all(
            """
            SELECT CategoryID, CategoryName, TotalSpent, TotalTransactions
            FROM vw_category_wise_spending
            ORDER BY TotalSpent DESC, CategoryID
            """
        )

    def get_budget_vs_actual(
        self,
        budget_year: Optional[int] = None,
        budget_month: Optional[int] = None,
        user_id: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        return self._fetch_all(
            """
            SELECT
                BudgetID, UserID, UserName, CategoryID, CategoryName,
                BudgetYear, BudgetMonth, PlannedAmount, WarningPercent,
                SpentAmount, RemainingBudget, AlertLevel
            FROM vw_budget_vs_actual_monthly
            WHERE (%s IS NULL OR BudgetYear = %s)
              AND (%s IS NULL OR BudgetMonth = %s)
              AND (%s IS NULL OR UserID = %s)
            ORDER BY BudgetYear, BudgetMonth, UserID, CategoryID
            """,
            (
                budget_year,
                budget_year,
                budget_month,
                budget_month,
                user_id,
                user_id,
            ),
        )

    def get_spending_limit_alerts(self) -> List[Dict[str, Any]]:
        return self._fetch_all(
            """
            SELECT
                BudgetID, UserID, UserName, CategoryID, CategoryName,
                BudgetYear, BudgetMonth, PlannedAmount, WarningPercent,
                SpentAmount, RemainingBudget, AlertLevel
            FROM vw_spending_limit_alerts
            ORDER BY
                AlertSortOrder,
                UserID,
                CategoryID
            """
        )

    def get_balance_history(
        self, user_id: Optional[int] = None, account_id: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        return self._fetch_all(
            """
            SELECT
                UserID, UserName, AccountID, BankName,
                TransactionDate, TransactionType, ReferenceID,
                AmountSigned, RunningBalance
            FROM vw_account_balance_history
            WHERE (%s IS NULL OR UserID = %s)
              AND (%s IS NULL OR AccountID = %s)
            ORDER BY
                UserID,
                AccountID,
                TransactionDate,
                SortOrder,
                ReferenceID
            """,
            (user_id, user_id, account_id, account_id),
        )

    def get_monthly_closure_summary(self, year: int, month: int) -> List[Dict[str, Any]]:
        return self._fetch_all("CALL sp_monthly_closure_summary(%s, %s)", (year, month))

    def get_user_summary_from_functions(self, user_id: int) -> Optional[Dict[str, Any]]:
        rows = self._fetch_all(
            """
            SELECT
                fn_total_income_by_user(%s) AS TotalIncome,
                fn_total_expense_by_user(%s) AS TotalExpense,
                fn_net_saving_by_user(%s) AS NetSaving
            """,
            (user_id, user_id, user_id),
        )
        return rows[0] if rows else None

    def add_budget_plan(
        self,
        user_id: int,
        category_id: int,
        budget_year: int,
        budget_month: int,
        planned_amount: float,
        warning_percent: float,
        is_soft_locked: int = 0,
        budget_priority: str = "MEDIUM",
        notes: Optional[str] = None,
    ) -> None:
        self._execute(
            """
            INSERT INTO BudgetPlans (
                UserID,
                CategoryID,
                BudgetYear,
                BudgetMonth,
                PlannedAmount,
                WarningPercent,
                IsSoftLocked,
                BudgetPriority,
                Notes
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                user_id,
                category_id,
                budget_year,
                budget_month,
                planned_amount,
                warning_percent,
                is_soft_locked,
                budget_priority,
                notes,
            ),
        )

    def update_budget_plan(
        self,
        budget_id: int,
        user_id: int,
        category_id: int,
        budget_year: int,
        budget_month: int,
        planned_amount: float,
        warning_percent: float,
        is_soft_locked: int = 0,
        budget_priority: str = "MEDIUM",
        notes: Optional[str] = None,
    ) -> None:
        self._execute(
            """
            UPDATE BudgetPlans
            SET
                UserID = %s,
                CategoryID = %s,
                BudgetYear = %s,
                BudgetMonth = %s,
                PlannedAmount = %s,
                WarningPercent = %s,
                IsSoftLocked = %s,
                BudgetPriority = %s,
                Notes = %s
            WHERE BudgetID = %s
            """,
            (
                user_id,
                category_id,
                budget_year,
                budget_month,
                planned_amount,
                warning_percent,
                is_soft_locked,
                budget_priority,
                notes,
                budget_id,
            ),
        )

    def delete_budget_plan(self, budget_id: int) -> None:
        self._execute(
            """
            DELETE FROM BudgetPlans
            WHERE BudgetID = %s
            """,
            (budget_id,),
        )

    def get_budget_plan_by_id(self, budget_id: int) -> Optional[Dict[str, Any]]:
        return self._fetch_one(
            """
            SELECT
                BudgetID, UserID, CategoryID, BudgetYear, BudgetMonth,
                PlannedAmount, WarningPercent, IsSoftLocked, BudgetPriority, Notes, CreatedAt
            FROM BudgetPlans
            WHERE BudgetID = %s
            """,
            (budget_id,),
        )

    def get_budget_plans_by_user(
        self,
        user_id: int,
        budget_year: Optional[int] = None,
        budget_month: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        return self._fetch_all(
            """
            SELECT
                b.BudgetID,
                b.UserID,
                u.UserName,
                b.CategoryID,
                c.CategoryName,
                b.BudgetYear,
                b.BudgetMonth,
                b.PlannedAmount,
                b.WarningPercent,
                b.IsSoftLocked,
                b.BudgetPriority,
                b.Notes,
                b.CreatedAt
            FROM BudgetPlans b
            JOIN Users u ON b.UserID = u.UserID
            JOIN ExpenseCategories c ON b.CategoryID = c.CategoryID
            WHERE b.UserID = %s
              AND (%s IS NULL OR b.BudgetYear = %s)
              AND (%s IS NULL OR b.BudgetMonth = %s)
            ORDER BY b.BudgetYear DESC, b.BudgetMonth DESC, b.CategoryID, b.BudgetID
            """,
            (user_id, budget_year, budget_year, budget_month, budget_month),
        )

    def get_budget_settings(
        self,
        user_id: int,
        budget_year: int,
        budget_month: int,
    ) -> Optional[Dict[str, Any]]:
        return self._fetch_one(
            """
            SELECT
                BudgetSettingID,
                UserID,
                BudgetYear,
                BudgetMonth,
                ExpectedIncome,
                FixedExpenseEstimate,
                FixedExpenseItemsJson,
                GoalContributionTarget,
                EmergencyBuffer,
                CreatedAt,
                UpdatedAt
            FROM BudgetSettings
            WHERE UserID = %s
              AND (
                    BudgetYear < %s
                    OR (BudgetYear = %s AND BudgetMonth <= %s)
                  )
            ORDER BY BudgetYear DESC, BudgetMonth DESC
            LIMIT 1
            """,
            (user_id, budget_year, budget_year, budget_month),
        )

    def upsert_budget_settings(
        self,
        user_id: int,
        budget_year: int,
        budget_month: int,
        expected_income: float,
        fixed_expense_estimate: float,
        fixed_expense_items_json: Optional[str],
        goal_contribution_target: float,
        emergency_buffer: float,
    ) -> None:
        self._execute(
            """
            INSERT INTO BudgetSettings (
                UserID,
                BudgetYear,
                BudgetMonth,
                ExpectedIncome,
                FixedExpenseEstimate,
                FixedExpenseItemsJson,
                GoalContributionTarget,
                EmergencyBuffer
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                ExpectedIncome = VALUES(ExpectedIncome),
                FixedExpenseEstimate = VALUES(FixedExpenseEstimate),
                FixedExpenseItemsJson = VALUES(FixedExpenseItemsJson),
                GoalContributionTarget = VALUES(GoalContributionTarget),
                EmergencyBuffer = VALUES(EmergencyBuffer)
            """,
            (
                user_id,
                budget_year,
                budget_month,
                expected_income,
                fixed_expense_estimate,
                fixed_expense_items_json,
                goal_contribution_target,
                emergency_buffer,
            ),
        )

    def get_average_monthly_category_spending(
        self,
        user_id: int,
        category_id: int,
        cutoff_date: Any,
        lookback_months: int = 3,
    ) -> float:
        row = self._fetch_one(
            """
            SELECT AVG(month_total) AS AverageSpent
            FROM (
                SELECT
                    DATE_FORMAT(ExpenseDate, '%Y-%m') AS YearMonth,
                    SUM(Amount) AS month_total
                FROM Expenses
                WHERE UserID = %s
                  AND CategoryID = %s
                  AND ExpenseDate < %s
                GROUP BY DATE_FORMAT(ExpenseDate, '%Y-%m')
                ORDER BY YearMonth DESC
                LIMIT %s
            ) monthly_totals
            """,
            (user_id, category_id, cutoff_date, lookback_months),
        )
        if not row or row.get("AverageSpent") is None:
            return 0.0
        return float(row["AverageSpent"])

    def find_budget_plan_duplicate(
        self,
        user_id: int,
        category_id: int,
        budget_year: int,
        budget_month: int,
        exclude_budget_id: Optional[int] = None,
    ) -> Optional[Dict[str, Any]]:
        rows = self._fetch_all(
            """
            SELECT BudgetID, UserID, CategoryID, BudgetYear, BudgetMonth
            FROM BudgetPlans
            WHERE UserID = %s
              AND CategoryID = %s
              AND BudgetYear = %s
              AND BudgetMonth = %s
              AND (%s IS NULL OR BudgetID <> %s)
            LIMIT 1
            """,
            (
                user_id,
                category_id,
                budget_year,
                budget_month,
                exclude_budget_id,
                exclude_budget_id,
            ),
        )
        return rows[0] if rows else None

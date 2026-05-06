-- Canonical views for the Personal Finance Management System.
-- Database name must remain Personal_Finance.

USE Personal_Finance;

-- View 1: total income by user
-- Purpose: quick per-user summary of all income transactions.
DROP VIEW IF EXISTS vw_total_income_by_user;
CREATE VIEW vw_total_income_by_user AS
SELECT
    u.UserID,
    u.UserName,
    COALESCE(SUM(i.Amount), 0) AS TotalIncome
FROM Users u
LEFT JOIN Income i ON u.UserID = i.UserID
GROUP BY u.UserID, u.UserName;

-- View 2: total expense by user
-- Purpose: quick per-user summary of all expense transactions.
DROP VIEW IF EXISTS vw_total_expense_by_user;
CREATE VIEW vw_total_expense_by_user AS
SELECT
    u.UserID,
    u.UserName,
    COALESCE(SUM(e.Amount), 0) AS TotalExpense
FROM Users u
LEFT JOIN Expenses e ON u.UserID = e.UserID
GROUP BY u.UserID, u.UserName;

-- View 3: monthly income, expense, and net saving summary
-- Purpose: month-level financial trend for reporting dashboards.
DROP VIEW IF EXISTS vw_monthly_income_expense_net_saving;
CREATE VIEW vw_monthly_income_expense_net_saving AS
SELECT
    md.YearMonth,
    SUM(md.TotalIncome) AS MonthlyIncome,
    SUM(md.TotalExpense) AS MonthlyExpense,
    SUM(md.TotalIncome) - SUM(md.TotalExpense) AS NetSaving
FROM (
    SELECT
        DATE_FORMAT(IncomeDate, '%Y-%m') AS YearMonth,
        SUM(Amount) AS TotalIncome,
        0 AS TotalExpense
    FROM Income
    GROUP BY DATE_FORMAT(IncomeDate, '%Y-%m')

    UNION ALL

    SELECT
        DATE_FORMAT(ExpenseDate, '%Y-%m') AS YearMonth,
        0 AS TotalIncome,
        SUM(Amount) AS TotalExpense
    FROM Expenses
    GROUP BY DATE_FORMAT(ExpenseDate, '%Y-%m')
) md
GROUP BY md.YearMonth;

-- View 4: category-wise spending summary
-- Purpose: show total spending by each expense category.
DROP VIEW IF EXISTS vw_category_wise_spending;
CREATE VIEW vw_category_wise_spending AS
SELECT
    u.UserID,
    u.UserName,
    c.CategoryID,
    c.CategoryName,
    COALESCE(SUM(e.Amount), 0) AS TotalSpent,
    COUNT(e.ExpenseID) AS TotalTransactions
FROM Users u
CROSS JOIN ExpenseCategories c
LEFT JOIN Expenses e
    ON u.UserID = e.UserID
   AND c.CategoryID = e.CategoryID
GROUP BY
    u.UserID,
    u.UserName,
    c.CategoryID,
    c.CategoryName;

-- View 5: budget vs actual spending by month/category
-- Purpose: compare planned budget and actual expense for each user/category/month.
DROP VIEW IF EXISTS vw_budget_vs_actual_monthly;
CREATE VIEW vw_budget_vs_actual_monthly AS
SELECT
    base.BudgetID,
    base.UserID,
    base.UserName,
    base.CategoryID,
    base.CategoryName,
    base.BudgetYear,
    base.BudgetMonth,
    base.PlannedAmount,
    base.WarningPercent,
    base.SpentAmount,
    base.RemainingBudget,
    alert_map.AlertLevel,
    base.AlertSortOrder
FROM (
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
        COALESCE(e.SpentAmount, 0) AS SpentAmount,
        b.PlannedAmount - COALESCE(e.SpentAmount, 0) AS RemainingBudget,
        CASE
            WHEN COALESCE(e.SpentAmount, 0) > b.PlannedAmount THEN 1
            WHEN COALESCE(e.SpentAmount, 0) >= b.PlannedAmount * (b.WarningPercent / 100) THEN 2
            ELSE 3
        END AS AlertSortOrder
    FROM BudgetPlans b
    JOIN Users u ON b.UserID = u.UserID
    JOIN ExpenseCategories c ON b.CategoryID = c.CategoryID
    LEFT JOIN (
        SELECT
            UserID,
            CategoryID,
            YEAR(ExpenseDate) AS ExpenseYear,
            MONTH(ExpenseDate) AS ExpenseMonth,
            SUM(Amount) AS SpentAmount
        FROM Expenses
        GROUP BY UserID, CategoryID, YEAR(ExpenseDate), MONTH(ExpenseDate)
    ) e
        ON b.UserID = e.UserID
       AND b.CategoryID = e.CategoryID
       AND b.BudgetYear = e.ExpenseYear
       AND b.BudgetMonth = e.ExpenseMonth
) base
JOIN (
    SELECT 1 AS AlertSortOrder, _utf8mb4'EXCEEDED' COLLATE utf8mb4_0900_ai_ci AS AlertLevel
    UNION ALL
    SELECT 2 AS AlertSortOrder, _utf8mb4'WARNING' COLLATE utf8mb4_0900_ai_ci AS AlertLevel
    UNION ALL
    SELECT 3 AS AlertSortOrder, _utf8mb4'NORMAL' COLLATE utf8mb4_0900_ai_ci AS AlertLevel
) alert_map
    ON base.AlertSortOrder = alert_map.AlertSortOrder;

-- View 6: spending limit alerts
-- Purpose: return only budget lines that are in WARNING or EXCEEDED state.
DROP VIEW IF EXISTS vw_spending_limit_alerts;
CREATE VIEW vw_spending_limit_alerts AS
SELECT
    BudgetID,
    UserID,
    UserName,
    CategoryID,
    CategoryName,
    BudgetYear,
    BudgetMonth,
    PlannedAmount,
    WarningPercent,
    SpentAmount,
    RemainingBudget,
    AlertLevel,
    AlertSortOrder
FROM vw_budget_vs_actual_monthly
WHERE AlertSortOrder IN (1, 2);

-- View 7: account balance history (transaction-based running balance)
-- Purpose: show chronological balance evolution for each account.
-- Tie-break for same timestamp: INCOME first, then EXPENSE, then ReferenceID.
DROP VIEW IF EXISTS vw_account_balance_history;
CREATE VIEW vw_account_balance_history AS
SELECT
    t.UserID,
    u.UserName,
    t.AccountID,
    b.BankName,
    t.TransactionDate,
    t.TransactionType,
    t.SortOrder,
    t.ReferenceID,
    t.AmountSigned,
    SUM(t.AmountSigned) OVER (
        PARTITION BY t.UserID, t.AccountID
        ORDER BY t.TransactionDate, t.SortOrder, t.ReferenceID
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS RunningBalance
FROM (
    SELECT
        i.UserID,
        i.AccountID,
        i.IncomeDate AS TransactionDate,
        _utf8mb4'INCOME' COLLATE utf8mb4_0900_ai_ci AS TransactionType,
        i.IncomeID AS ReferenceID,
        i.Amount AS AmountSigned,
        1 AS SortOrder
    FROM Income i

    UNION ALL

    SELECT
        e.UserID,
        e.AccountID,
        e.ExpenseDate AS TransactionDate,
        _utf8mb4'EXPENSE' COLLATE utf8mb4_0900_ai_ci AS TransactionType,
        e.ExpenseID AS ReferenceID,
        -e.Amount AS AmountSigned,
        2 AS SortOrder
    FROM Expenses e
) t
JOIN Users u ON t.UserID = u.UserID
JOIN BankAccounts ba ON t.UserID = ba.UserID AND t.AccountID = ba.AccountID
JOIN Banks b ON b.BankID = ba.BankID;

-- View 8: saving goal progress
-- Purpose: show goal progress, monthly required saving, and goal alert level.
DROP VIEW IF EXISTS vw_saving_goal_progress;
CREATE VIEW vw_saving_goal_progress AS
SELECT
    g.GoalID,
    g.UserID,
    u.UserName,
    g.LinkedAccountID,
    b.BankName,
    g.GoalName,
    g.GoalType,
    g.TargetAmount,
    g.CurrentAmount,
    g.TargetAmount - g.CurrentAmount AS RemainingAmount,
    ROUND((g.CurrentAmount / g.TargetAmount) * 100, 2) AS ProgressPercent,
    g.StartDate,
    g.TargetDate,
    g.GoalCategoryID,
    sgc.CategoryKey AS GoalCategoryKey,
    sgc.CategoryName AS GoalCategoryName,
    sgc.IconEmoji AS GoalIconEmoji,
    sgc.IsCustomAllowed AS GoalCategoryIsCustomAllowed,
    g.CustomGoalCategoryName,
    CASE
        WHEN g.TargetDate IS NULL THEN NULL
        ELSE DATEDIFF(g.TargetDate, CURDATE())
    END AS DaysRemaining,
    CASE
        WHEN g.TargetDate IS NULL THEN NULL
        WHEN DATEDIFF(g.TargetDate, CURDATE()) <= 0 THEN g.TargetAmount - g.CurrentAmount
        ELSE ROUND((g.TargetAmount - g.CurrentAmount) / GREATEST(TIMESTAMPDIFF(MONTH, CURDATE(), g.TargetDate), 1), 2)
    END AS MonthlyRequired,
    g.AnnualGrowthRate,
    g.Status,
    CASE
        WHEN g.Status = 'CANCELLED' THEN _utf8mb4'CANCELLED' COLLATE utf8mb4_0900_ai_ci
        WHEN g.CurrentAmount >= g.TargetAmount THEN _utf8mb4'COMPLETED' COLLATE utf8mb4_0900_ai_ci
        WHEN g.TargetDate IS NOT NULL AND g.TargetDate < CURDATE() THEN _utf8mb4'OVERDUE' COLLATE utf8mb4_0900_ai_ci
        WHEN g.TargetDate IS NOT NULL AND DATEDIFF(g.TargetDate, CURDATE()) <= 30 THEN _utf8mb4'DUE_SOON' COLLATE utf8mb4_0900_ai_ci
        ELSE _utf8mb4'ON_TRACK' COLLATE utf8mb4_0900_ai_ci
    END AS GoalAlertLevel,
    g.Notes,
    g.CreatedAt
FROM SavingGoals g
JOIN Users u
    ON g.UserID = u.UserID
LEFT JOIN SavingGoalCategories sgc
    ON g.GoalCategoryID = sgc.GoalCategoryID
LEFT JOIN BankAccounts ba
    ON g.LinkedAccountID = ba.AccountID
   AND g.UserID = ba.UserID
LEFT JOIN Banks b
    ON ba.BankID = b.BankID;

-- View 9: smart budget overview
DROP VIEW IF EXISTS vw_smart_budget_overview;
CREATE VIEW vw_smart_budget_overview AS
SELECT
    bs.UserID,
    u.UserName,
    bs.BudgetYear,
    bs.BudgetMonth,
    bs.ExpectedIncome,
    bs.FixedExpenseEstimate,
    bs.FixedExpenseItemsJson,
    bs.GoalContributionTarget,
    bs.EmergencyBuffer,
    bs.ExpectedIncome
        - bs.FixedExpenseEstimate
        - bs.GoalContributionTarget
        - bs.EmergencyBuffer AS AvailableToBudget,
    COALESCE(SUM(bp.PlannedAmount), 0) AS TotalPlannedBudget,
    (
        bs.ExpectedIncome
        - bs.FixedExpenseEstimate
        - bs.GoalContributionTarget
        - bs.EmergencyBuffer
        - COALESCE(SUM(bp.PlannedAmount), 0)
    ) AS RemainingToAllocate,
    CASE
        WHEN COALESCE(SUM(bp.PlannedAmount), 0) >
             (bs.ExpectedIncome - bs.FixedExpenseEstimate - bs.GoalContributionTarget - bs.EmergencyBuffer) * 1.2
            THEN 'OVERPLANNED'
        WHEN COALESCE(SUM(bp.PlannedAmount), 0) >
             (bs.ExpectedIncome - bs.FixedExpenseEstimate - bs.GoalContributionTarget - bs.EmergencyBuffer) * 1.1
            THEN 'RISKY'
        WHEN COALESCE(SUM(bp.PlannedAmount), 0) >
             (bs.ExpectedIncome - bs.FixedExpenseEstimate - bs.GoalContributionTarget - bs.EmergencyBuffer)
            THEN 'CAUTION'
        ELSE 'HEALTHY'
    END AS BudgetHealth
FROM BudgetSettings bs
JOIN Users u
    ON bs.UserID = u.UserID
LEFT JOIN BudgetPlans bp
    ON bs.UserID = bp.UserID
   AND bs.BudgetYear = bp.BudgetYear
   AND bs.BudgetMonth = bp.BudgetMonth
GROUP BY
    bs.UserID,
    u.UserName,
    bs.BudgetYear,
    bs.BudgetMonth,
    bs.ExpectedIncome,
    bs.FixedExpenseEstimate,
    bs.FixedExpenseItemsJson,
    bs.GoalContributionTarget,
    bs.EmergencyBuffer;

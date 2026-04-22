-- Canonical reporting and validation queries for the Personal Finance Management System.

USE Personal_Finance;

-- 1. TOTAL INCOME BY USER
SELECT
    u.UserID,
    u.UserName,
    SUM(i.Amount) AS TotalIncome
FROM Users u
JOIN Income i ON u.UserID = i.UserID
GROUP BY u.UserID, u.UserName
ORDER BY TotalIncome DESC;

-- 2. TOTAL EXPENSE BY USER
SELECT
    u.UserID,
    u.UserName,
    SUM(e.Amount) AS TotalExpense
FROM Users u
JOIN Expenses e ON u.UserID = e.UserID
GROUP BY u.UserID, u.UserName
ORDER BY TotalExpense DESC;

-- 3. TOTAL EXPENSE BY CATEGORY
SELECT
    c.CategoryID,
    c.CategoryName,
    SUM(e.Amount) AS TotalSpent
FROM ExpenseCategories c
JOIN Expenses e ON c.CategoryID = e.CategoryID
GROUP BY c.CategoryID, c.CategoryName
ORDER BY TotalSpent DESC;

-- 4. CURRENT BALANCE OF EACH BANK ACCOUNT
SELECT
    ba.AccountID,
    u.UserName,
    ba.BankName,
    ba.Balance
FROM BankAccounts ba
JOIN Users u ON ba.UserID = u.UserID
ORDER BY u.UserID, ba.AccountID;

-- 5. MONTHLY INCOME, EXPENSE, AND NET SAVING
SELECT
    YearMonth,
    SUM(TotalIncome) AS MonthlyIncome,
    SUM(TotalExpense) AS MonthlyExpense,
    SUM(TotalIncome) - SUM(TotalExpense) AS NetSaving
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
) AS MonthlyData
GROUP BY YearMonth
ORDER BY YearMonth;

-- 6. TOTAL INCOME, TOTAL EXPENSE, AND REMAINING MONEY BY USER
SELECT
    u.UserID,
    u.UserName,
    COALESCE(i.TotalIncome, 0) AS TotalIncome,
    COALESCE(e.TotalExpense, 0) AS TotalExpense,
    COALESCE(i.TotalIncome, 0) - COALESCE(e.TotalExpense, 0) AS RemainingMoney
FROM Users u
LEFT JOIN (
    SELECT UserID, SUM(Amount) AS TotalIncome
    FROM Income
    GROUP BY UserID
) i ON u.UserID = i.UserID
LEFT JOIN (
    SELECT UserID, SUM(Amount) AS TotalExpense
    FROM Expenses
    GROUP BY UserID
) e ON u.UserID = e.UserID
ORDER BY RemainingMoney DESC;

-- 7. TOP SPENDING CATEGORY FOR EACH USER
SELECT
    UserID,
    UserName,
    CategoryName,
    TotalSpent
FROM (
    SELECT
        u.UserID,
        u.UserName,
        c.CategoryName,
        SUM(e.Amount) AS TotalSpent,
        ROW_NUMBER() OVER (
            PARTITION BY u.UserID
            ORDER BY SUM(e.Amount) DESC
        ) AS rn
    FROM Users u
    JOIN Expenses e ON u.UserID = e.UserID
    JOIN ExpenseCategories c ON e.CategoryID = c.CategoryID
    GROUP BY u.UserID, u.UserName, c.CategoryName
) ranked
WHERE rn = 1
ORDER BY TotalSpent DESC;

-- 8. TRANSACTION HISTORY BY ACCOUNT
SELECT
    t.UserID,
    t.UserName,
    t.AccountID,
    t.BankName,
    t.TransactionType,
    t.TransactionID,
    t.TransactionDate,
    t.Amount,
    t.Description
FROM (
    SELECT
        u.UserID,
        u.UserName,
        ba.AccountID,
        ba.BankName,
        'INCOME' AS TransactionType,
        i.IncomeID AS TransactionID,
        i.IncomeDate AS TransactionDate,
        i.Amount,
        i.Description
    FROM Income i
    JOIN Users u ON i.UserID = u.UserID
    JOIN BankAccounts ba ON i.AccountID = ba.AccountID AND i.UserID = ba.UserID

    UNION ALL

    SELECT
        u.UserID,
        u.UserName,
        ba.AccountID,
        ba.BankName,
        'EXPENSE' AS TransactionType,
        e.ExpenseID AS TransactionID,
        e.ExpenseDate AS TransactionDate,
        e.Amount,
        e.Description
    FROM Expenses e
    JOIN Users u ON e.UserID = u.UserID
    JOIN BankAccounts ba ON e.AccountID = ba.AccountID AND e.UserID = ba.UserID
) t
ORDER BY
    t.UserID,
    t.AccountID,
    t.TransactionDate,
    CASE
        WHEN t.TransactionType COLLATE utf8mb4_0900_ai_ci
             = _utf8mb4'INCOME' COLLATE utf8mb4_0900_ai_ci THEN 1
        ELSE 2
    END,
    t.TransactionID;

-- 9. DAILY EXPENSE SUMMARY
SELECT
    DATE(ExpenseDate) AS ExpenseDay,
    SUM(Amount) AS DailyExpense
FROM Expenses
GROUP BY DATE(ExpenseDate)
ORDER BY ExpenseDay;

-- 10. COMPARE CALCULATED BALANCE WITH STORED BALANCE
SELECT
    ba.AccountID,
    u.UserName,
    ba.BankName,
    COALESCE(i.TotalIncome, 0) AS TotalIncome,
    COALESCE(e.TotalExpense, 0) AS TotalExpense,
    COALESCE(i.TotalIncome, 0) - COALESCE(e.TotalExpense, 0) AS CalculatedBalance,
    ba.Balance AS StoredBalance
FROM BankAccounts ba
JOIN Users u ON ba.UserID = u.UserID
LEFT JOIN (
    SELECT UserID, AccountID, SUM(Amount) AS TotalIncome
    FROM Income
    GROUP BY UserID, AccountID
) i ON ba.UserID = i.UserID AND ba.AccountID = i.AccountID
LEFT JOIN (
    SELECT UserID, AccountID, SUM(Amount) AS TotalExpense
    FROM Expenses
    GROUP BY UserID, AccountID
) e ON ba.UserID = e.UserID AND ba.AccountID = e.AccountID
ORDER BY ba.UserID, ba.AccountID;

-- 11. QUICK DATA CHECKS
SELECT * FROM Users;
SELECT * FROM ExpenseCategories;
SELECT * FROM BankAccounts;
SELECT * FROM Income;
SELECT * FROM Expenses;

SELECT
    i.IncomeID,
    i.UserID,
    u.UserName,
    i.AccountID,
    ba.BankName,
    i.Amount,
    i.IncomeDate
FROM Income i
JOIN Users u ON i.UserID = u.UserID
JOIN BankAccounts ba ON i.AccountID = ba.AccountID AND i.UserID = ba.UserID
ORDER BY i.IncomeID;

SELECT
    e.ExpenseID,
    e.UserID,
    u.UserName,
    e.AccountID,
    ba.BankName,
    e.CategoryID,
    c.CategoryName,
    e.Amount,
    e.ExpenseDate
FROM Expenses e
JOIN Users u ON e.UserID = u.UserID
JOIN BankAccounts ba ON e.AccountID = ba.AccountID AND e.UserID = ba.UserID
JOIN ExpenseCategories c ON e.CategoryID = c.CategoryID
ORDER BY e.ExpenseID;

-- 12. YEARLY INCOME, EXPENSE, AND NET SAVING SUMMARY
SELECT
    ReportYear,
    SUM(TotalIncome) AS YearlyIncome,
    SUM(TotalExpense) AS YearlyExpense,
    SUM(TotalIncome) - SUM(TotalExpense) AS NetSaving
FROM (
    SELECT
        YEAR(IncomeDate) AS ReportYear,
        SUM(Amount) AS TotalIncome,
        0 AS TotalExpense
    FROM Income
    GROUP BY YEAR(IncomeDate)

    UNION ALL

    SELECT
        YEAR(ExpenseDate) AS ReportYear,
        0 AS TotalIncome,
        SUM(Amount) AS TotalExpense
    FROM Expenses
    GROUP BY YEAR(ExpenseDate)
) yearly_data
GROUP BY ReportYear
ORDER BY ReportYear;

-- 13. MONTHLY CATEGORY SPENDING TREND
SELECT
    DATE_FORMAT(e.ExpenseDate, '%Y-%m') AS YearMonth,
    c.CategoryID,
    c.CategoryName,
    SUM(e.Amount) AS TotalSpent
FROM Expenses e
JOIN ExpenseCategories c ON e.CategoryID = c.CategoryID
GROUP BY
    DATE_FORMAT(e.ExpenseDate, '%Y-%m'),
    c.CategoryID,
    c.CategoryName
ORDER BY YearMonth, TotalSpent DESC, c.CategoryID;

-- 14. BUDGET PLANS BY USER/CATEGORY/MONTH
SELECT
    b.BudgetID,
    b.UserID,
    u.UserName,
    b.CategoryID,
    c.CategoryName,
    b.BudgetYear,
    b.BudgetMonth,
    b.PlannedAmount,
    b.WarningPercent
FROM BudgetPlans b
JOIN Users u ON b.UserID = u.UserID
JOIN ExpenseCategories c ON b.CategoryID = c.CategoryID
ORDER BY b.BudgetYear, b.BudgetMonth, b.UserID, b.CategoryID;

-- 15. BUDGET VS ACTUAL (MONTHLY)
SELECT
    BudgetID,
    UserID,
    UserName,
    CategoryID,
    CategoryName,
    BudgetYear,
    BudgetMonth,
    PlannedAmount,
    SpentAmount,
    RemainingBudget,
    AlertLevel
FROM vw_budget_vs_actual_monthly
ORDER BY BudgetYear, BudgetMonth, UserID, CategoryID;

-- 16. ACTIVE SPENDING LIMIT ALERTS
SELECT
    UserID,
    UserName,
    CategoryID,
    CategoryName,
    BudgetYear,
    BudgetMonth,
    PlannedAmount,
    SpentAmount,
    RemainingBudget,
    AlertLevel
FROM vw_spending_limit_alerts
ORDER BY
    AlertSortOrder,
    UserID,
    CategoryID;

-- 17. BALANCE HISTORY (RUNNING BALANCE BY ACCOUNT)
SELECT
    UserID,
    UserName,
    AccountID,
    BankName,
    TransactionDate,
    TransactionType,
    ReferenceID,
    AmountSigned,
    RunningBalance
FROM vw_account_balance_history
ORDER BY
    UserID,
    AccountID,
    TransactionDate,
    CASE
        WHEN TransactionType COLLATE utf8mb4_0900_ai_ci
             = _utf8mb4'INCOME' COLLATE utf8mb4_0900_ai_ci THEN 1
        ELSE 2
    END,
    ReferenceID;

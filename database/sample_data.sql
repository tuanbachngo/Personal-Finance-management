-- Canonical sample data file for the Personal Finance Management System.
-- Run this after schema.sql.
-- Data range: January 2025 -> April 2026 (more than 12 months).

USE Personal_Finance;

-- 1. USERS (10 users)
INSERT INTO Users (UserID, UserName, Email, PhoneNumber) VALUES
(1, 'Nguyen Minh Anh', 'minhanh@gmail.com', '0901000001'),
(2, 'Tran Quoc Bao', 'quocbao@gmail.com', '0901000002'),
(3, 'Le Thu Ha', 'thuha@gmail.com', '0901000003'),
(4, 'Pham Gia Huy', 'giahuy@gmail.com', '0901000004'),
(5, 'Do Ngoc Linh', 'ngoclinh@gmail.com', '0901000005'),
(6, 'Vu Khanh Nam', 'khanhnam@gmail.com', '0901000006'),
(7, 'Bui Thanh Mai', 'thanhmai@gmail.com', '0901000007'),
(8, 'Phan Duc Long', 'duclong@gmail.com', '0901000008'),
(9, 'Dang Bao Chau', 'baochau@gmail.com', '0901000009'),
(10, 'Ngo Tuan Bach', 'tuanbachngo@gmail.com', '0901000010');

-- 1.1 USER CREDENTIALS (APP-LEVEL AUTH)
-- Credentials are intentionally not seeded with hard-coded passwords.
-- Use `ops/bootstrap_auth.py` with local environment variables after reset.

-- 2. EXPENSE CATEGORIES
INSERT INTO ExpenseCategories (CategoryID, CategoryName) VALUES
(1, 'Food'),
(2, 'Transportation'),
(3, 'Education'),
(4, 'Entertainment'),
(5, 'Shopping'),
(6, 'Healthcare'),
(7, 'Utilities'),
(8, 'Rent');

-- 3. BANK CATALOG
INSERT INTO Banks (BankID, BankCode, BankName, IsActive) VALUES
(1, 'VCB', 'Vietcombank', 1),
(2, 'TCB', 'Techcombank', 1),
(3, 'BIDV', 'BIDV', 1),
(4, 'ACB', 'ACB', 1),
(5, 'MBB', 'MB Bank', 1),
(6, 'CTG', 'VietinBank', 1),
(7, 'TPB', 'TPBank', 1),
(8, 'STB', 'Sacombank', 1),
(9, 'VPB', 'VPBank', 1),
(10, 'AGR', 'Agribank', 1),
(11, 'SHB', 'SHB', 1),
(12, 'HDB', 'HDBank', 1),
(13, 'VIB', 'VIB', 1),
(14, 'MSB', 'MSB', 1),
(15, 'OCB', 'OCB', 1),
(16, 'LPB', 'LPBank', 1),
(17, 'EIB', 'Eximbank', 1),
(18, 'NAB', 'Nam A Bank', 1),
(19, 'BAB', 'Bac A Bank', 1),
(20, 'ABB', 'ABBANK', 1),
(21, 'SEAB', 'SeABank', 1),
(22, 'PVCOM', 'PVcomBank', 1),
(23, 'KLB', 'KienlongBank', 1);

-- 4. BANK ACCOUNTS
-- Start with Balance = 0, then sync from Income and Expenses below.
INSERT INTO BankAccounts (AccountID, UserID, BankID, Balance) VALUES
(1, 1, 1, 0.00),
(2, 1, 2, 0.00),
(3, 2, 3, 0.00),
(4, 3, 4, 0.00),
(5, 4, 5, 0.00),
(6, 5, 6, 0.00),
(7, 5, 7, 0.00),
(8, 6, 8, 0.00),
(9, 7, 9, 0.00),
(10, 8, 10, 0.00),
(11, 9, 11, 0.00),
(12, 10, 12, 0.00);

-- 5. INCOME
-- 5.1 Primary monthly income by profile (all months from 2025-01 to 2026-04)
INSERT INTO Income (UserID, AccountID, Amount, IncomeDate, Description)
WITH RECURSIVE months AS (
    SELECT DATE('2025-01-01') AS MonthStart, 1 AS MonthNo
    UNION ALL
    SELECT DATE_ADD(MonthStart, INTERVAL 1 MONTH), MonthNo + 1
    FROM months
    WHERE MonthStart < DATE('2026-04-01')
),
income_profiles AS (
    SELECT 1 AS UserID, 1 AS AccountID, 20000000.00 AS BaseIncome, 'Monthly salary' AS IncomeSource
    UNION ALL SELECT 2, 3, 16000000.00, 'Monthly salary'
    UNION ALL SELECT 3, 4, 13000000.00, 'Monthly salary'
    UNION ALL SELECT 4, 5, 23000000.00, 'Monthly salary'
    UNION ALL SELECT 5, 6, 17500000.00, 'Monthly salary'
    UNION ALL SELECT 6, 8, 9000000.00, 'Main salary (variable)'
    UNION ALL SELECT 7, 9, 14500000.00, 'Monthly salary'
    UNION ALL SELECT 8, 10, 12500000.00, 'Monthly salary'
    UNION ALL SELECT 9, 11, 11000000.00, 'Monthly salary'
    UNION ALL SELECT 10, 12, 15000000.00, 'Monthly salary'
)
SELECT
    p.UserID,
    p.AccountID,
    p.BaseIncome
    + CASE
        WHEN p.UserID = 6 THEN
            CASE MOD(m.MonthNo, 4)
                WHEN 0 THEN -2200000.00
                WHEN 1 THEN 0.00
                WHEN 2 THEN 1500000.00
                ELSE -700000.00
            END
        ELSE 0.00
      END
    + CASE
        WHEN p.UserID = 10 AND MOD(m.MonthNo, 3) = 0 THEN 1800000.00
        ELSE 0.00
      END AS Amount,
    TIMESTAMP(m.MonthStart, '08:00:00') AS IncomeDate,
    CONCAT(p.IncomeSource, ' - ', DATE_FORMAT(m.MonthStart, '%Y-%m')) AS Description
FROM months m
JOIN income_profiles p ON 1 = 1;

-- 4.2 User 1: freelance income on second account (even months)
INSERT INTO Income (UserID, AccountID, Amount, IncomeDate, Description)
WITH RECURSIVE months AS (
    SELECT DATE('2025-01-01') AS MonthStart, 1 AS MonthNo
    UNION ALL
    SELECT DATE_ADD(MonthStart, INTERVAL 1 MONTH), MonthNo + 1
    FROM months
    WHERE MonthStart < DATE('2026-04-01')
)
SELECT
    1,
    2,
    3500000.00,
    TIMESTAMP(DATE_ADD(MonthStart, INTERVAL 14 DAY), '19:30:00'),
    CONCAT('Freelance design income - ', DATE_FORMAT(MonthStart, '%Y-%m'))
FROM months
WHERE MOD(MonthNo, 2) = 0;

-- 4.3 User 3: tutoring income (odd months)
INSERT INTO Income (UserID, AccountID, Amount, IncomeDate, Description)
WITH RECURSIVE months AS (
    SELECT DATE('2025-01-01') AS MonthStart, 1 AS MonthNo
    UNION ALL
    SELECT DATE_ADD(MonthStart, INTERVAL 1 MONTH), MonthNo + 1
    FROM months
    WHERE MonthStart < DATE('2026-04-01')
)
SELECT
    3,
    4,
    1800000.00,
    TIMESTAMP(DATE_ADD(MonthStart, INTERVAL 21 DAY), '20:10:00'),
    CONCAT('Tutoring income - ', DATE_FORMAT(MonthStart, '%Y-%m'))
FROM months
WHERE MOD(MonthNo, 2) = 1;

-- 4.4 User 5: online business income on second account (all months)
INSERT INTO Income (UserID, AccountID, Amount, IncomeDate, Description)
WITH RECURSIVE months AS (
    SELECT DATE('2025-01-01') AS MonthStart, 1 AS MonthNo
    UNION ALL
    SELECT DATE_ADD(MonthStart, INTERVAL 1 MONTH), MonthNo + 1
    FROM months
    WHERE MonthStart < DATE('2026-04-01')
)
SELECT
    5,
    7,
    2200000.00 + CASE WHEN MOD(MonthNo, 3) = 0 THEN 900000.00 ELSE 0.00 END,
    TIMESTAMP(DATE_ADD(MonthStart, INTERVAL 14 DAY), '21:20:00'),
    CONCAT('Online business income - ', DATE_FORMAT(MonthStart, '%Y-%m'))
FROM months;

-- 4.5 User 8: quarterly scholarship/side income
INSERT INTO Income (UserID, AccountID, Amount, IncomeDate, Description)
WITH RECURSIVE months AS (
    SELECT DATE('2025-01-01') AS MonthStart, 1 AS MonthNo
    UNION ALL
    SELECT DATE_ADD(MonthStart, INTERVAL 1 MONTH), MonthNo + 1
    FROM months
    WHERE MonthStart < DATE('2026-04-01')
)
SELECT
    8,
    10,
    1200000.00,
    TIMESTAMP(DATE_ADD(MonthStart, INTERVAL 24 DAY), '20:00:00'),
    CONCAT('Quarterly scholarship - ', DATE_FORMAT(MonthStart, '%Y-%m'))
FROM months
WHERE MOD(MonthNo, 3) = 0;

-- 4.6 User 9: overtime income (even months)
INSERT INTO Income (UserID, AccountID, Amount, IncomeDate, Description)
WITH RECURSIVE months AS (
    SELECT DATE('2025-01-01') AS MonthStart, 1 AS MonthNo
    UNION ALL
    SELECT DATE_ADD(MonthStart, INTERVAL 1 MONTH), MonthNo + 1
    FROM months
    WHERE MonthStart < DATE('2026-04-01')
)
SELECT
    9,
    11,
    1000000.00,
    TIMESTAMP(DATE_ADD(MonthStart, INTERVAL 17 DAY), '19:40:00'),
    CONCAT('Overtime income - ', DATE_FORMAT(MonthStart, '%Y-%m'))
FROM months
WHERE MOD(MonthNo, 2) = 0;

-- 5. EXPENSES
-- 5.1 Base monthly expenses by profile: rent, food, transportation
INSERT INTO Expenses (UserID, AccountID, CategoryID, Amount, ExpenseDate, Description)
WITH RECURSIVE months AS (
    SELECT DATE('2025-01-01') AS MonthStart
    UNION ALL
    SELECT DATE_ADD(MonthStart, INTERVAL 1 MONTH)
    FROM months
    WHERE MonthStart < DATE('2026-04-01')
),
expense_profiles AS (
    SELECT 1 AS UserID, 1 AS AccountID, 3500000.00 AS RentAmt, 2200000.00 AS FoodAmt, 1000000.00 AS TransportAmt
    UNION ALL SELECT 2, 3, 6000000.00, 2500000.00, 1200000.00
    UNION ALL SELECT 3, 4, 4000000.00, 2000000.00, 800000.00
    UNION ALL SELECT 4, 5, 5000000.00, 2600000.00, 1100000.00
    UNION ALL SELECT 5, 6, 4500000.00, 2300000.00, 1100000.00
    UNION ALL SELECT 6, 8, 2500000.00, 1600000.00, 900000.00
    UNION ALL SELECT 7, 9, 5500000.00, 2400000.00, 1100000.00
    UNION ALL SELECT 8, 10, 3200000.00, 2000000.00, 900000.00
    UNION ALL SELECT 9, 11, 3000000.00, 1800000.00, 800000.00
    UNION ALL SELECT 10, 12, 4000000.00, 2200000.00, 1000000.00
)
SELECT
    p.UserID,
    p.AccountID,
    8,
    p.RentAmt,
    TIMESTAMP(DATE_ADD(m.MonthStart, INTERVAL 2 DAY), '09:00:00'),
    CONCAT('Monthly rent - ', DATE_FORMAT(m.MonthStart, '%Y-%m'))
FROM months m
JOIN expense_profiles p ON 1 = 1;

INSERT INTO Expenses (UserID, AccountID, CategoryID, Amount, ExpenseDate, Description)
WITH RECURSIVE months AS (
    SELECT DATE('2025-01-01') AS MonthStart
    UNION ALL
    SELECT DATE_ADD(MonthStart, INTERVAL 1 MONTH)
    FROM months
    WHERE MonthStart < DATE('2026-04-01')
),
expense_profiles AS (
    SELECT 1 AS UserID, 1 AS AccountID, 2200000.00 AS FoodAmt
    UNION ALL SELECT 2, 3, 2500000.00
    UNION ALL SELECT 3, 4, 2000000.00
    UNION ALL SELECT 4, 5, 2600000.00
    UNION ALL SELECT 5, 6, 2300000.00
    UNION ALL SELECT 6, 8, 1600000.00
    UNION ALL SELECT 7, 9, 2400000.00
    UNION ALL SELECT 8, 10, 2000000.00
    UNION ALL SELECT 9, 11, 1800000.00
    UNION ALL SELECT 10, 12, 2200000.00
)
SELECT
    p.UserID,
    p.AccountID,
    1,
    p.FoodAmt,
    TIMESTAMP(DATE_ADD(m.MonthStart, INTERVAL 9 DAY), '19:00:00'),
    CONCAT('Food and groceries - ', DATE_FORMAT(m.MonthStart, '%Y-%m'))
FROM months m
JOIN expense_profiles p ON 1 = 1;

INSERT INTO Expenses (UserID, AccountID, CategoryID, Amount, ExpenseDate, Description)
WITH RECURSIVE months AS (
    SELECT DATE('2025-01-01') AS MonthStart
    UNION ALL
    SELECT DATE_ADD(MonthStart, INTERVAL 1 MONTH)
    FROM months
    WHERE MonthStart < DATE('2026-04-01')
),
expense_profiles AS (
    SELECT 1 AS UserID, 1 AS AccountID, 1000000.00 AS TransportAmt
    UNION ALL SELECT 2, 3, 1200000.00
    UNION ALL SELECT 3, 4, 800000.00
    UNION ALL SELECT 4, 5, 1100000.00
    UNION ALL SELECT 5, 6, 1100000.00
    UNION ALL SELECT 6, 8, 900000.00
    UNION ALL SELECT 7, 9, 1100000.00
    UNION ALL SELECT 8, 10, 900000.00
    UNION ALL SELECT 9, 11, 800000.00
    UNION ALL SELECT 10, 12, 1000000.00
)
SELECT
    p.UserID,
    p.AccountID,
    2,
    p.TransportAmt,
    TIMESTAMP(DATE_ADD(m.MonthStart, INTERVAL 17 DAY), '08:30:00'),
    CONCAT('Transportation cost - ', DATE_FORMAT(m.MonthStart, '%Y-%m'))
FROM months m
JOIN expense_profiles p ON 1 = 1;

-- 5.2 User-specific spending behavior for profile diversity
INSERT INTO Expenses (UserID, AccountID, CategoryID, Amount, ExpenseDate, Description)
WITH RECURSIVE months AS (
    SELECT DATE('2025-01-01') AS MonthStart, 1 AS MonthNo
    UNION ALL
    SELECT DATE_ADD(MonthStart, INTERVAL 1 MONTH), MonthNo + 1
    FROM months
    WHERE MonthStart < DATE('2026-04-01')
)
SELECT
    1,
    2,
    4,
    1000000.00,
    TIMESTAMP(DATE_ADD(MonthStart, INTERVAL 21 DAY), '21:05:00'),
    CONCAT('Entertainment spending - ', DATE_FORMAT(MonthStart, '%Y-%m'))
FROM months
WHERE MOD(MonthNo, 2) = 0;

INSERT INTO Expenses (UserID, AccountID, CategoryID, Amount, ExpenseDate, Description)
WITH RECURSIVE months AS (
    SELECT DATE('2025-01-01') AS MonthStart
    UNION ALL
    SELECT DATE_ADD(MonthStart, INTERVAL 1 MONTH)
    FROM months
    WHERE MonthStart < DATE('2026-04-01')
)
SELECT
    2,
    3,
    7,
    1200000.00,
    TIMESTAMP(DATE_ADD(MonthStart, INTERVAL 23 DAY), '20:00:00'),
    CONCAT('Utilities bill - ', DATE_FORMAT(MonthStart, '%Y-%m'))
FROM months;

INSERT INTO Expenses (UserID, AccountID, CategoryID, Amount, ExpenseDate, Description)
WITH RECURSIVE months AS (
    SELECT DATE('2025-01-01') AS MonthStart, 1 AS MonthNo
    UNION ALL
    SELECT DATE_ADD(MonthStart, INTERVAL 1 MONTH), MonthNo + 1
    FROM months
    WHERE MonthStart < DATE('2026-04-01')
)
SELECT
    3,
    4,
    6,
    CASE WHEN MOD(MonthNo, 4) = 3 THEN 1800000.00 ELSE 600000.00 END,
    TIMESTAMP(DATE_ADD(MonthStart, INTERVAL 13 DAY), '10:00:00'),
    CONCAT('Healthcare spending - ', DATE_FORMAT(MonthStart, '%Y-%m'))
FROM months;

INSERT INTO Expenses (UserID, AccountID, CategoryID, Amount, ExpenseDate, Description)
WITH RECURSIVE months AS (
    SELECT DATE('2025-01-01') AS MonthStart
    UNION ALL
    SELECT DATE_ADD(MonthStart, INTERVAL 1 MONTH)
    FROM months
    WHERE MonthStart < DATE('2026-04-01')
)
SELECT
    4,
    5,
    5,
    1500000.00,
    TIMESTAMP(DATE_ADD(MonthStart, INTERVAL 19 DAY), '21:10:00'),
    CONCAT('Shopping spending - ', DATE_FORMAT(MonthStart, '%Y-%m'))
FROM months;

INSERT INTO Expenses (UserID, AccountID, CategoryID, Amount, ExpenseDate, Description)
WITH RECURSIVE months AS (
    SELECT DATE('2025-01-01') AS MonthStart
    UNION ALL
    SELECT DATE_ADD(MonthStart, INTERVAL 1 MONTH)
    FROM months
    WHERE MonthStart < DATE('2026-04-01')
)
SELECT
    5,
    7,
    5,
    1400000.00,
    TIMESTAMP(DATE_ADD(MonthStart, INTERVAL 20 DAY), '20:30:00'),
    CONCAT('Personal shopping - ', DATE_FORMAT(MonthStart, '%Y-%m'))
FROM months;

INSERT INTO Expenses (UserID, AccountID, CategoryID, Amount, ExpenseDate, Description)
WITH RECURSIVE months AS (
    SELECT DATE('2025-01-01') AS MonthStart, 1 AS MonthNo
    UNION ALL
    SELECT DATE_ADD(MonthStart, INTERVAL 1 MONTH), MonthNo + 1
    FROM months
    WHERE MonthStart < DATE('2026-04-01')
)
SELECT
    6,
    8,
    6,
    CASE WHEN MOD(MonthNo, 3) = 0 THEN 1700000.00 ELSE 500000.00 END,
    TIMESTAMP(DATE_ADD(MonthStart, INTERVAL 24 DAY), '09:30:00'),
    CONCAT('Healthcare cost (variable) - ', DATE_FORMAT(MonthStart, '%Y-%m'))
FROM months;

INSERT INTO Expenses (UserID, AccountID, CategoryID, Amount, ExpenseDate, Description)
WITH RECURSIVE months AS (
    SELECT DATE('2025-01-01') AS MonthStart
    UNION ALL
    SELECT DATE_ADD(MonthStart, INTERVAL 1 MONTH)
    FROM months
    WHERE MonthStart < DATE('2026-04-01')
)
SELECT
    7,
    9,
    4,
    900000.00,
    TIMESTAMP(DATE_ADD(MonthStart, INTERVAL 22 DAY), '21:15:00'),
    CONCAT('Entertainment spending - ', DATE_FORMAT(MonthStart, '%Y-%m'))
FROM months;

INSERT INTO Expenses (UserID, AccountID, CategoryID, Amount, ExpenseDate, Description)
WITH RECURSIVE months AS (
    SELECT DATE('2025-01-01') AS MonthStart
    UNION ALL
    SELECT DATE_ADD(MonthStart, INTERVAL 1 MONTH)
    FROM months
    WHERE MonthStart < DATE('2026-04-01')
)
SELECT
    8,
    10,
    3,
    2200000.00,
    TIMESTAMP(DATE_ADD(MonthStart, INTERVAL 18 DAY), '18:45:00'),
    CONCAT('Education spending - ', DATE_FORMAT(MonthStart, '%Y-%m'))
FROM months;

INSERT INTO Expenses (UserID, AccountID, CategoryID, Amount, ExpenseDate, Description)
WITH RECURSIVE months AS (
    SELECT DATE('2025-01-01') AS MonthStart, 1 AS MonthNo
    UNION ALL
    SELECT DATE_ADD(MonthStart, INTERVAL 1 MONTH), MonthNo + 1
    FROM months
    WHERE MonthStart < DATE('2026-04-01')
)
SELECT
    9,
    11,
    6,
    CASE WHEN MOD(MonthNo, 2) = 1 THEN 2500000.00 ELSE 900000.00 END,
    TIMESTAMP(DATE_ADD(MonthStart, INTERVAL 13 DAY), '09:45:00'),
    CONCAT('Healthcare spending - ', DATE_FORMAT(MonthStart, '%Y-%m'))
FROM months;

INSERT INTO Expenses (UserID, AccountID, CategoryID, Amount, ExpenseDate, Description)
WITH RECURSIVE months AS (
    SELECT DATE('2025-01-01') AS MonthStart
    UNION ALL
    SELECT DATE_ADD(MonthStart, INTERVAL 1 MONTH)
    FROM months
    WHERE MonthStart < DATE('2026-04-01')
)
SELECT
    10,
    12,
    5,
    2800000.00,
    TIMESTAMP(DATE_ADD(MonthStart, INTERVAL 19 DAY), '20:45:00'),
    CONCAT('Shopping spending - ', DATE_FORMAT(MonthStart, '%Y-%m'))
FROM months;

-- 6. BUDGET PLANS (March 2026 + April 2026)
-- Includes NORMAL, WARNING, and EXCEEDED scenarios.
INSERT INTO BudgetPlans (
    UserID, CategoryID, BudgetYear, BudgetMonth, PlannedAmount, WarningPercent
) VALUES
-- March 2026
(1, 8, 2026, 3, 3800000.00, 80.00),
(1, 1, 2026, 3, 3000000.00, 80.00),
(2, 8, 2026, 3, 5800000.00, 80.00),
(2, 7, 2026, 3, 1600000.00, 80.00),
(3, 6, 2026, 3, 1700000.00, 80.00),
(3, 8, 2026, 3, 5000000.00, 80.00),
(4, 5, 2026, 3, 1800000.00, 80.00),
(4, 3, 2026, 3, 2500000.00, 80.00),
(5, 5, 2026, 3, 1500000.00, 80.00),
(5, 8, 2026, 3, 6000000.00, 80.00),
(6, 6, 2026, 3, 1500000.00, 80.00),
(6, 1, 2026, 3, 1900000.00, 80.00),
(7, 4, 2026, 3, 1000000.00, 80.00),
(7, 8, 2026, 3, 7000000.00, 80.00),
(8, 3, 2026, 3, 2100000.00, 80.00),
(8, 8, 2026, 3, 5000000.00, 80.00),
(9, 6, 2026, 3, 2600000.00, 80.00),
(9, 1, 2026, 3, 2500000.00, 80.00),
(10, 5, 2026, 3, 2500000.00, 80.00),
(10, 8, 2026, 3, 4500000.00, 80.00),
-- April 2026
(1, 4, 2026, 4, 1200000.00, 80.00),
(2, 8, 2026, 4, 7000000.00, 80.00),
(3, 6, 2026, 4, 900000.00, 80.00),
(4, 5, 2026, 4, 1400000.00, 80.00),
(5, 5, 2026, 4, 2000000.00, 80.00),
(6, 6, 2026, 4, 600000.00, 80.00),
(7, 4, 2026, 4, 1300000.00, 80.00),
(8, 3, 2026, 4, 2300000.00, 80.00),
(9, 6, 2026, 4, 1000000.00, 80.00),
(10, 5, 2026, 4, 3200000.00, 80.00);

-- 7. SYNC ACCOUNT BALANCES FROM TRANSACTIONS
UPDATE BankAccounts ba
LEFT JOIN (
    SELECT UserID, AccountID, SUM(Amount) AS TotalIncome
    FROM Income
    GROUP BY UserID, AccountID
) i
    ON ba.UserID = i.UserID AND ba.AccountID = i.AccountID
LEFT JOIN (
    SELECT UserID, AccountID, SUM(Amount) AS TotalExpense
    FROM Expenses
    GROUP BY UserID, AccountID
) e
    ON ba.UserID = e.UserID AND ba.AccountID = e.AccountID
SET ba.Balance = COALESCE(i.TotalIncome, 0) - COALESCE(e.TotalExpense, 0)
WHERE ba.AccountID > 0;

-- 8. SAVING GOAL CATEGORIES
INSERT INTO SavingGoalCategories (
    CategoryKey,
    CategoryName,
    IconEmoji,
    Description,
    IsCustomAllowed,
    SortOrder
)
VALUES
    ('EMERGENCY_FUND', 'Emergency Fund', '🛟', 'Safety fund for unexpected expenses.', 0, 1),
    ('VACATION', 'Vacation / Travel', '🏝️', 'Saving for trips, vacation, or travel plans.', 0, 2),
    ('LAPTOP', 'Laptop / Computer', '💻', 'Saving for laptop, computer, or work equipment.', 0, 3),
    ('HOME_DOWN_PAYMENT', 'Home Down Payment', '🏠', 'Saving for house or apartment down payment.', 0, 4),
    ('CAR', 'Car / Vehicle', '🚗', 'Saving for car, motorbike, or other vehicle.', 0, 5),
    ('EDUCATION', 'Education', '🎓', 'Saving for tuition, courses, or learning expenses.', 0, 6),
    ('WEDDING', 'Wedding', '💍', 'Saving for wedding or marriage plans.', 0, 7),
    ('HEALTH', 'Health / Medical', '🏥', 'Saving for healthcare or medical expenses.', 0, 8),
    ('BUSINESS', 'Business', '💼', 'Saving for business or startup plans.', 0, 9),
    ('INVESTMENT', 'Investment', '📈', 'Saving for investment goals.', 0, 10),
    ('GIFT', 'Gift', '🎁', 'Saving for gifts or special occasions.', 0, 11),
    ('OTHER', 'Other / Custom', '💰', 'Custom saving goal category.', 1, 99);

-- 9. SAVING GOALS
INSERT INTO SavingGoals (
    UserID,
    LinkedAccountID,
    GoalName,
    GoalType,
    GoalCategoryID,
    CustomGoalCategoryName,
    TargetAmount,
    CurrentAmount,
    StartDate,
    TargetDate,
    AnnualGrowthRate,
    Status,
    Notes
)
SELECT
    u.UserID,
    MIN(ba.AccountID),
    'Emergency Fund',
    'SAVE_UP',
    c.GoalCategoryID,
    NULL,
    50000000.00,
    8000000.00,
    CURDATE(),
    DATE_ADD(CURDATE(), INTERVAL 10 MONTH),
    0.00,
    'ACTIVE',
    'Build a safety fund for unexpected expenses.'
FROM Users u
JOIN BankAccounts ba ON u.UserID = ba.UserID
JOIN SavingGoalCategories c ON c.CategoryKey = 'EMERGENCY_FUND'
GROUP BY u.UserID, c.GoalCategoryID;

INSERT INTO SavingGoals (
    UserID,
    LinkedAccountID,
    GoalName,
    GoalType,
    GoalCategoryID,
    CustomGoalCategoryName,
    TargetAmount,
    CurrentAmount,
    StartDate,
    TargetDate,
    AnnualGrowthRate,
    Status,
    Notes
)
SELECT
    u.UserID,
    MIN(ba.AccountID),
    'Buy a Laptop',
    'SAVE_UP',
    c.GoalCategoryID,
    NULL,
    25000000.00,
    10000000.00,
    CURDATE(),
    DATE_ADD(CURDATE(), INTERVAL 5 MONTH),
    0.00,
    'ACTIVE',
    'Personal technology upgrade goal.'
FROM Users u
JOIN BankAccounts ba ON u.UserID = ba.UserID
JOIN SavingGoalCategories c ON c.CategoryKey = 'LAPTOP'
GROUP BY u.UserID, c.GoalCategoryID;

INSERT INTO SavingGoals (
    UserID,
    LinkedAccountID,
    GoalName,
    GoalType,
    GoalCategoryID,
    CustomGoalCategoryName,
    TargetAmount,
    CurrentAmount,
    StartDate,
    TargetDate,
    AnnualGrowthRate,
    Status,
    Notes
)
SELECT
    u.UserID,
    MIN(ba.AccountID),
    'Personal Saving',
    'SAVE_UP',
    c.GoalCategoryID,
    'My custom saving plan',
    15000000.00,
    2000000.00,
    CURDATE(),
    DATE_ADD(CURDATE(), INTERVAL 6 MONTH),
    0.00,
    'ACTIVE',
    'Custom saving goal.'
FROM Users u
JOIN BankAccounts ba ON u.UserID = ba.UserID
JOIN SavingGoalCategories c ON c.CategoryKey = 'OTHER'
GROUP BY u.UserID, c.GoalCategoryID;

-- 10. GOAL CONTRIBUTIONS
INSERT INTO GoalContributions (
    GoalID,
    UserID,
    AccountID,
    Amount,
    ContributionType,
    ContributionDate,
    Description
)
SELECT
    g.GoalID,
    g.UserID,
    g.LinkedAccountID,
    2000000.00,
    'DEPOSIT',
    CURDATE(),
    'Initial goal contribution'
FROM SavingGoals g
WHERE g.GoalName IN ('Emergency Fund', 'Buy a Laptop');

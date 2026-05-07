-- Canonical sample data file for the Personal Finance Management System.
-- Run this after schema.sql.
-- Data range: January 2025 -> April 2026 (more than 12 months).

USE Personal_Finance;
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;

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
INSERT INTO ExpenseCategories (CategoryID, CategoryName, IconEmoji) VALUES
(1, 'Ăn uống', '🍽️'),
(2, 'Di chuyển', '🚗'),
(3, 'Giáo dục', '🎓'),
(4, 'Giải trí', '🎬'),
(5, 'Mua sắm', '🛍️'),
(6, 'Sức khỏe', '🏥'),
(7, 'Hóa đơn', '💡'),
(8, 'Thuê nhà', '🏠'),
(9, 'Tích lũy', '💰'),
(10, 'Trả nợ', '💳');

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
    SELECT 1 AS UserID, 1 AS AccountID, 20000000.00 AS BaseIncome, 'Lương hàng tháng' AS IncomeSource
    UNION ALL SELECT 2, 3, 16000000.00, 'Lương hàng tháng'
    UNION ALL SELECT 3, 4, 13000000.00, 'Lương hàng tháng'
    UNION ALL SELECT 4, 5, 23000000.00, 'Lương hàng tháng'
    UNION ALL SELECT 5, 6, 17500000.00, 'Lương hàng tháng'
    UNION ALL SELECT 6, 8, 9000000.00, 'Lương chính (biến động)'
    UNION ALL SELECT 7, 9, 14500000.00, 'Lương hàng tháng'
    UNION ALL SELECT 8, 10, 12500000.00, 'Lương hàng tháng'
    UNION ALL SELECT 9, 11, 11000000.00, 'Lương hàng tháng'
    UNION ALL SELECT 10, 12, 15000000.00, 'Lương hàng tháng'
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
    CONCAT('Thu nhập thiết kế tự do - ', DATE_FORMAT(MonthStart, '%Y-%m'))
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
    CONCAT('Thu nhập dạy kèm - ', DATE_FORMAT(MonthStart, '%Y-%m'))
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
    CONCAT('Thu nhập kinh doanh online - ', DATE_FORMAT(MonthStart, '%Y-%m'))
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
    CONCAT('Học bổng theo quý - ', DATE_FORMAT(MonthStart, '%Y-%m'))
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
    CONCAT('Thu nhập làm thêm giờ - ', DATE_FORMAT(MonthStart, '%Y-%m'))
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
    CONCAT('Tiền thuê nhà hàng tháng - ', DATE_FORMAT(m.MonthStart, '%Y-%m'))
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
    CONCAT('Ăn uống và tạp hóa - ', DATE_FORMAT(m.MonthStart, '%Y-%m'))
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
    CONCAT('Chi phí di chuyển - ', DATE_FORMAT(m.MonthStart, '%Y-%m'))
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
    CONCAT('Chi tiêu giải trí - ', DATE_FORMAT(MonthStart, '%Y-%m'))
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
    CONCAT('Hóa đơn tiện ích - ', DATE_FORMAT(MonthStart, '%Y-%m'))
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
    CONCAT('Chi tiêu sức khỏe - ', DATE_FORMAT(MonthStart, '%Y-%m'))
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
    CONCAT('Chi tiêu mua sắm - ', DATE_FORMAT(MonthStart, '%Y-%m'))
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
    CONCAT('Mua sắm cá nhân - ', DATE_FORMAT(MonthStart, '%Y-%m'))
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
    CONCAT('Chi phí sức khỏe (biến động) - ', DATE_FORMAT(MonthStart, '%Y-%m'))
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
    CONCAT('Chi tiêu giải trí - ', DATE_FORMAT(MonthStart, '%Y-%m'))
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
    CONCAT('Chi tiêu giáo dục - ', DATE_FORMAT(MonthStart, '%Y-%m'))
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
    CONCAT('Chi tiêu sức khỏe - ', DATE_FORMAT(MonthStart, '%Y-%m'))
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
    CONCAT('Chi tiêu mua sắm - ', DATE_FORMAT(MonthStart, '%Y-%m'))
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
    ('EMERGENCY_FUND', 'Quỹ khẩn cấp', '🛟', 'Quỹ an toàn cho các chi phí phát sinh.', 0, 1),
    ('VACATION', 'Du lịch / Nghỉ dưỡng', '🏝️', 'Tiết kiệm cho các chuyến du lịch và nghỉ dưỡng.', 0, 2),
    ('LAPTOP', 'Laptop / Máy tính', '💻', 'Tiết kiệm để mua laptop, máy tính hoặc thiết bị làm việc.', 0, 3),
    ('HOME_DOWN_PAYMENT', 'Trả trước mua nhà', '🏠', 'Tiết kiệm tiền trả trước khi mua nhà hoặc căn hộ.', 0, 4),
    ('CAR', 'Ô tô / Phương tiện', '🚗', 'Tiết kiệm để mua ô tô, xe máy hoặc phương tiện khác.', 0, 5),
    ('EDUCATION', 'Giáo dục', '🎓', 'Tiết kiệm cho học phí, khóa học hoặc chi phí học tập.', 0, 6),
    ('WEDDING', 'Đám cưới', '💍', 'Tiết kiệm cho kế hoạch cưới hỏi.', 0, 7),
    ('HEALTH', 'Sức khỏe / Y tế', '🏥', 'Tiết kiệm cho chăm sóc sức khỏe và chi phí y tế.', 0, 8),
    ('BUSINESS', 'Kinh doanh', '💼', 'Tiết kiệm cho kế hoạch kinh doanh hoặc khởi nghiệp.', 0, 9),
    ('INVESTMENT', 'Đầu tư', '📈', 'Tiết kiệm dành cho mục tiêu đầu tư.', 0, 10),
    ('GIFT', 'Quà tặng', '🎁', 'Tiết kiệm cho quà tặng và dịp đặc biệt.', 0, 11),
    ('OTHER', 'Khác / Tùy chỉnh', '💰', 'Danh mục mục tiêu tiết kiệm tùy chỉnh.', 1, 99);

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
    'Quỹ khẩn cấp',
    'SAVE_UP',
    c.GoalCategoryID,
    NULL,
    50000000.00,
    8000000.00,
    CURDATE(),
    DATE_ADD(CURDATE(), INTERVAL 10 MONTH),
    0.00,
    'ACTIVE',
    'Xây dựng quỹ an toàn cho chi phí phát sinh.'
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
    'Mua laptop',
    'SAVE_UP',
    c.GoalCategoryID,
    NULL,
    25000000.00,
    10000000.00,
    CURDATE(),
    DATE_ADD(CURDATE(), INTERVAL 5 MONTH),
    0.00,
    'ACTIVE',
    'Mục tiêu nâng cấp thiết bị công nghệ cá nhân.'
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
    'Tiết kiệm cá nhân',
    'SAVE_UP',
    c.GoalCategoryID,
    'Kế hoạch tiết kiệm cá nhân tùy chỉnh',
    15000000.00,
    2000000.00,
    CURDATE(),
    DATE_ADD(CURDATE(), INTERVAL 6 MONTH),
    0.00,
    'ACTIVE',
    'Mục tiêu tiết kiệm tùy chỉnh.'
FROM Users u
JOIN BankAccounts ba ON u.UserID = ba.UserID
JOIN SavingGoalCategories c ON c.CategoryKey = 'OTHER'
GROUP BY u.UserID, c.GoalCategoryID;

-- 10. DEBT / PAY-DOWN GOALS
-- 10.1 Credit card debt goal for every user
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
    'Nợ thẻ tín dụng',
    'PAY_DOWN',
    c.GoalCategoryID,
    NULL,
    18000000.00 + (u.UserID * 500000.00),
    3500000.00 + (u.UserID * 200000.00),
    DATE_SUB(CURDATE(), INTERVAL 2 MONTH),
    DATE_ADD(CURDATE(), INTERVAL 8 MONTH),
    0.00,
    'ACTIVE',
    'Mục tiêu giảm dần dư nợ thẻ tín dụng theo tháng.'
FROM Users u
JOIN BankAccounts ba ON u.UserID = ba.UserID
JOIN SavingGoalCategories c ON c.CategoryKey = 'OTHER'
GROUP BY u.UserID, c.GoalCategoryID;

-- 10.2 One additional debt goal for demo variety
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
    'Khoản vay mua xe',
    'PAY_DOWN',
    c.GoalCategoryID,
    NULL,
    90000000.00,
    12000000.00,
    DATE_SUB(CURDATE(), INTERVAL 3 MONTH),
    DATE_ADD(CURDATE(), INTERVAL 24 MONTH),
    0.00,
    'ACTIVE',
    'Khoản vay dài hạn, theo dõi tiến độ trả nợ định kỳ.'
FROM Users u
JOIN BankAccounts ba ON u.UserID = ba.UserID
JOIN SavingGoalCategories c ON c.CategoryKey = 'CAR'
WHERE u.UserID = 10
GROUP BY u.UserID, c.GoalCategoryID;

-- 11. GOAL CONTRIBUTIONS
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
    'Khoản đóng góp mục tiêu ban đầu'
FROM SavingGoals g
WHERE g.GoalName IN ('Quỹ khẩn cấp', 'Mua laptop');

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
    1200000.00,
    'DEPOSIT',
    DATE_SUB(CURDATE(), INTERVAL 20 DAY),
    'Thanh toán nợ kỳ gần nhất'
FROM SavingGoals g
WHERE g.GoalType = 'PAY_DOWN'
  AND g.GoalName = 'Nợ thẻ tín dụng';

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
    2500000.00,
    'DEPOSIT',
    DATE_SUB(CURDATE(), INTERVAL 10 DAY),
    'Thanh toán trả nợ khoản vay xe'
FROM SavingGoals g
WHERE g.GoalType = 'PAY_DOWN'
  AND g.GoalName = 'Khoản vay mua xe'
  AND g.UserID = 10;

-- SMART BUDGET SETTINGS
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
VALUES
    (1, 2026, 4, 23500000.00, 4500000.00, JSON_ARRAY(
        JSON_OBJECT('item_name', 'Thuê nhà', 'amount', 3500000, 'category_id', 8),
        JSON_OBJECT('item_name', 'Internet', 'amount', 1000000, 'category_id', 7)
    ), 2500000.00, 1500000.00),
    (10, 2026, 4, 16800000.00, 5000000.00, JSON_ARRAY(
        JSON_OBJECT('item_name', 'Thuê nhà', 'amount', 4000000, 'category_id', 8),
        JSON_OBJECT('item_name', 'Điện thoại và internet', 'amount', 1000000, 'category_id', 7)
    ), 2000000.00, 1000000.00);

-- TRANSACTION CATEGORY RULES
INSERT INTO TransactionCategoryRules (
    UserID,
    Keyword,
    CategoryID,
    Priority,
    IsActive
)
VALUES
    (NULL, 'highlands', 1, 10, 1),
    (NULL, 'coffee', 1, 10, 1),
    (NULL, 'grab', 2, 10, 1),
    (NULL, 'taxi', 2, 10, 1),
    (NULL, 'shopee', 5, 10, 1),
    (NULL, 'lazada', 5, 10, 1),
    (NULL, 'internet', 7, 10, 1),
    (NULL, 'electric', 7, 10, 1),
    (NULL, 'hospital', 6, 10, 1),
    (NULL, 'pharmacy', 6, 10, 1);

UPDATE BudgetPlans
SET
    IsSoftLocked = 1,
    BudgetPriority = 'LOW',
    Notes = 'Khóa mềm để giảm chi tiêu không cần thiết.'
WHERE CategoryID IN (4, 5)
  AND BudgetYear = 2026
  AND BudgetMonth = 4;

UPDATE BudgetPlans
SET
    BudgetPriority = 'HIGH',
    Notes = 'Chi tiêu thiết yếu hằng tháng.'
WHERE CategoryID IN (1, 8, 7)
  AND BudgetYear = 2026
  AND BudgetMonth = 4;

-- ============================================================
-- SAVING GOAL CATEGORIES (canonical seed — merged from migration 002)
-- ============================================================
INSERT INTO SavingGoalCategories
    (GoalCategoryID, CategoryKey, CategoryName, IconEmoji, Description, IsCustomAllowed, IsActive, SortOrder)
VALUES
    (1,  'EMERGENCY',    'Quỹ khẩn cấp',        '🛡️',  'Dự phòng rủi ro bất ngờ',              0, 1,  10),
    (2,  'TRAVEL',       'Du lịch',               '✈️',  'Tiết kiệm cho chuyến đi',               0, 1,  20),
    (3,  'HOME',         'Mua nhà / Thuê nhà',    '🏠',  'Tích lũy mua hoặc đặt cọc nhà',         0, 1,  30),
    (4,  'CAR',          'Mua xe',                '🚗',  'Tích lũy mua xe hoặc trả góp xe',        0, 1,  40),
    (5,  'EDUCATION',    'Giáo dục',              '🎓',  'Học phí, khóa học, nâng cao kỹ năng',    0, 1,  50),
    (6,  'WEDDING',      'Đám cưới',              '💍',  'Chi phí tổ chức hôn lễ',                0, 1,  60),
    (7,  'RETIREMENT',   'Hưu trí',               '👴',  'Tiết kiệm dài hạn cho tuổi hưu',         0, 1,  70),
    (8,  'INVESTMENT',   'Đầu tư',                '📈',  'Tích lũy vốn đầu tư chứng khoán / BĐS',  0, 1,  80),
    (9,  'GADGET',       'Thiết bị / Công nghệ',  '💻',  'Điện thoại, laptop, thiết bị thông minh',0, 1,  90),
    (10, 'HEALTH',       'Sức khỏe',              '🏥',  'Bảo hiểm, khám định kỳ, phục hồi',       0, 1, 100),
    (11, 'GIFT',         'Quà tặng / Từ thiện',   '🎁',  'Tích lũy cho dịp đặc biệt hoặc quyên góp',0, 1, 110),
    (12, 'BUSINESS',     'Kinh doanh',            '💼',  'Vốn khởi nghiệp hoặc mở rộng',          0, 1, 120),
    (13, 'CUSTOM',       'Mục tiêu tùy chỉnh',    '⭐',  'Tự đặt tên và mô tả mục tiêu',           1, 1, 130),
    (14, 'OTHER',        'Khác',                  '💰',  'Mục tiêu không thuộc danh mục trên',     0, 1, 999);

-- ============================================================
-- SAVING GOALS — demo data (SAVE_UP) for user 10
-- ============================================================
INSERT INTO SavingGoals
    (UserID, LinkedAccountID, GoalName, GoalType, GoalCategoryID, CustomGoalCategoryName,
     TargetAmount, CurrentAmount, StartDate, TargetDate, AnnualGrowthRate, Status, Notes)
VALUES
    (10, 12, 'Quỹ khẩn cấp', 'SAVE_UP', 1, NULL,
     30000000.00, 8500000.00,
     DATE_SUB(CURDATE(), INTERVAL 4 MONTH), DATE_ADD(CURDATE(), INTERVAL 8 MONTH),
     0.00, 'ACTIVE', 'Duy trì 3 tháng chi phí sinh hoạt.'),

    (10, 12, 'Du lịch Nhật Bản', 'SAVE_UP', 2, NULL,
     25000000.00, 6000000.00,
     DATE_SUB(CURDATE(), INTERVAL 2 MONTH), DATE_ADD(CURDATE(), INTERVAL 10 MONTH),
     0.00, 'ACTIVE', 'Chuyến đi Tokyo + Osaka tháng 3 năm sau.'),

    (10, 12, 'Mua Laptop mới', 'SAVE_UP', 9, NULL,
     22000000.00, 14000000.00,
     DATE_SUB(CURDATE(), INTERVAL 3 MONTH), DATE_ADD(CURDATE(), INTERVAL 3 MONTH),
     0.00, 'ACTIVE', 'MacBook Air M3.');

-- ============================================================
-- SAVING GOALS — PAY_DOWN demo (merged from migration 009)
-- ============================================================
INSERT INTO SavingGoals
    (UserID, LinkedAccountID, GoalName, GoalType, GoalCategoryID, CustomGoalCategoryName,
     TargetAmount, CurrentAmount, StartDate, TargetDate, AnnualGrowthRate, Status, Notes)
SELECT
    u.UserID,
    ba.AccountID,
    'Nợ thẻ tín dụng',
    'PAY_DOWN',
    14, -- OTHER
    NULL,
    18000000.00 + (u.UserID * 500000.00),
    3500000.00  + (u.UserID * 200000.00),
    DATE_SUB(CURDATE(), INTERVAL 2 MONTH),
    DATE_ADD(CURDATE(), INTERVAL 8 MONTH),
    0.00,
    'ACTIVE',
    'Mục tiêu giảm dần dư nợ thẻ tín dụng theo tháng.'
FROM Users u
JOIN (
    SELECT UserID, MIN(AccountID) AS AccountID
    FROM BankAccounts
    GROUP BY UserID
) ba ON ba.UserID = u.UserID
WHERE NOT EXISTS (
    SELECT 1 FROM SavingGoals g
    WHERE g.UserID = u.UserID
      AND g.GoalType = 'PAY_DOWN'
      AND g.GoalName = 'Nợ thẻ tín dụng'
);

-- Khoản vay mua xe cho user 10
INSERT INTO SavingGoals
    (UserID, LinkedAccountID, GoalName, GoalType, GoalCategoryID, CustomGoalCategoryName,
     TargetAmount, CurrentAmount, StartDate, TargetDate, AnnualGrowthRate, Status, Notes)
SELECT
    10,
    ba.AccountID,
    'Khoản vay mua xe',
    'PAY_DOWN',
    4, -- CAR
    NULL,
    90000000.00,
    12000000.00,
    DATE_SUB(CURDATE(), INTERVAL 3 MONTH),
    DATE_ADD(CURDATE(), INTERVAL 24 MONTH),
    0.00,
    'ACTIVE',
    'Khoản vay dài hạn, theo dõi tiến độ trả nợ định kỳ.'
FROM (SELECT MIN(AccountID) AS AccountID FROM BankAccounts WHERE UserID = 10) ba
WHERE ba.AccountID IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM SavingGoals g
      WHERE g.UserID = 10
        AND g.GoalType = 'PAY_DOWN'
        AND g.GoalName = 'Khoản vay mua xe'
  );

-- ============================================================
-- GOAL CONTRIBUTIONS — demo (merged from migration 009)
-- ============================================================
INSERT INTO GoalContributions (GoalID, UserID, AccountID, Amount, ContributionType, ContributionDate, Description)
SELECT
    g.GoalID, g.UserID, g.LinkedAccountID,
    1200000.00, 'DEPOSIT',
    DATE_SUB(CURDATE(), INTERVAL 20 DAY),
    'Thanh toán nợ kỳ gần nhất'
FROM SavingGoals g
WHERE g.GoalType = 'PAY_DOWN' AND g.GoalName = 'Nợ thẻ tín dụng'
  AND NOT EXISTS (
      SELECT 1 FROM GoalContributions gc
      WHERE gc.GoalID = g.GoalID AND gc.Description = 'Thanh toán nợ kỳ gần nhất'
  );

INSERT INTO GoalContributions (GoalID, UserID, AccountID, Amount, ContributionType, ContributionDate, Description)
SELECT
    g.GoalID, g.UserID, g.LinkedAccountID,
    2500000.00, 'DEPOSIT',
    DATE_SUB(CURDATE(), INTERVAL 10 DAY),
    'Thanh toán trả nợ khoản vay xe'
FROM SavingGoals g
WHERE g.GoalType = 'PAY_DOWN' AND g.GoalName = 'Khoản vay mua xe' AND g.UserID = 10
  AND NOT EXISTS (
      SELECT 1 FROM GoalContributions gc
      WHERE gc.GoalID = g.GoalID AND gc.Description = 'Thanh toán trả nợ khoản vay xe'
  );


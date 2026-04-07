-- Legacy file kept for compatibility.
-- Canonical query file: database/queries.sql

USE Personal_Finance;

-- =========================================================
-- 1) TỔNG THU THEO USER
-- Mục đích: xem mỗi người dùng có tổng thu nhập bao nhiêu
-- =========================================================
SELECT 
    u.UserID,
    u.UserName,
    SUM(i.Amount) AS TotalIncome
FROM Users u
JOIN Income i ON u.UserID = i.UserID
GROUP BY u.UserID, u.UserName
ORDER BY TotalIncome DESC;


-- =========================================================
-- 2) TỔNG CHI THEO USER
-- Mục đích: xem mỗi người dùng đã chi tổng cộng bao nhiêu
-- =========================================================
SELECT 
    u.UserID,
    u.UserName,
    SUM(e.Amount) AS TotalExpense
FROM Users u
JOIN Expenses e ON u.UserID = e.UserID
GROUP BY u.UserID, u.UserName
ORDER BY TotalExpense DESC;


-- =========================================================
-- 3) TỔNG CHI THEO CATEGORY
-- Mục đích: xem danh mục nào đang chi nhiều nhất
-- =========================================================
SELECT 
    c.CategoryID,
    c.CategoryName,
    SUM(e.Amount) AS TotalSpent
FROM ExpenseCategories c
JOIN Expenses e ON c.CategoryID = e.CategoryID
GROUP BY c.CategoryID, c.CategoryName
ORDER BY TotalSpent DESC;


-- =========================================================
-- 4) SỐ DƯ TỪNG TÀI KHOẢN
-- Mục đích: xem số dư hiện tại của từng tài khoản ngân hàng
-- =========================================================
SELECT 
    ba.AccountID,
    u.UserName,
    ba.BankName,
    ba.Balance
FROM BankAccounts ba
JOIN Users u ON ba.UserID = u.UserID
ORDER BY u.UserID, ba.AccountID;


-- =========================================================
-- 5) TỔNG HỢP THEO THÁNG
-- Mục đích: xem tổng thu, tổng chi, tiết kiệm ròng theo tháng
-- =========================================================
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


-- =========================================================
-- 6) TỔNG THU, TỔNG CHI, SỐ TIỀN CÒN LẠI THEO USER
-- Mục đích: xem bức tranh tài chính đầy đủ của từng người dùng
-- =========================================================
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


-- =========================================================
-- 7) TOP DANH MỤC CHI TIÊU NHIỀU NHẤT CỦA TỪNG USER
-- Mục đích: xác định mỗi user đang chi nhiều nhất vào đâu
-- =========================================================
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


-- =========================================================
-- 8) LỊCH SỬ GIAO DỊCH THEO TÀI KHOẢN
-- Mục đích: xem tất cả thu/chi của từng tài khoản ngân hàng
-- =========================================================
SELECT 
    t.UserID,
    t.UserName,
    t.AccountID,
    t.BankName,
    t.TransactionType,
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
        e.ExpenseDate AS TransactionDate,
        e.Amount,
        e.Description
    FROM Expenses e
    JOIN Users u ON e.UserID = u.UserID
    JOIN BankAccounts ba ON e.AccountID = ba.AccountID AND e.UserID = ba.UserID
) t
ORDER BY t.UserID, t.AccountID, t.TransactionDate;


-- =========================================================
-- 9) CHI TIÊU THEO NGÀY
-- Mục đích: xem mỗi ngày tổng chi là bao nhiêu
-- =========================================================
SELECT 
    ExpenseDate,
    SUM(Amount) AS DailyExpense
FROM Expenses
GROUP BY ExpenseDate
ORDER BY ExpenseDate;


-- =========================================================
-- 10) TÍNH SỐ DƯ TỪ GIAO DỊCH THỰC TẾ, KHÔNG DÙNG CỘT BALANCE
-- Mục đích: kiểm tra số dư tính toán có khớp với số dư lưu trong BankAccounts hay không
-- =========================================================
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

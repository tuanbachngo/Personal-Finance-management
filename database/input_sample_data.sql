-- Legacy file kept for compatibility.
-- Canonical sample data file: database/sample_data.sql

USE Personal_Finance;

-- 1) USERS
INSERT INTO Users (UserID, UserName, Email, PhoneNumber) VALUES
(1, 'Nguyen Minh Anh', 'minhanh@gmail.com', '0901000001'),
(2, 'Tran Quoc Bao', 'quocbao@gmail.com', '0901000002'),
(3, 'Le Thu Ha', 'thuha@gmail.com', '0901000003'),
(4, 'Pham Gia Huy', 'giahuy@gmail.com', '0901000004'),
(5, 'Do Ngoc Linh', 'ngoclinh@gmail.com', '0901000005');

-- 2) EXPENSE CATEGORIES
INSERT INTO ExpenseCategories (CategoryID, CategoryName) VALUES
(1, 'Food'),
(2, 'Transportation'),
(3, 'Education'),
(4, 'Entertainment'),
(5, 'Shopping'),
(6, 'Healthcare'),
(7, 'Utilities'),
(8, 'Rent');

-- 3) BANK ACCOUNTS
-- Để Balance = 0 trước, sau đó đồng bộ lại từ Income - Expenses
INSERT INTO BankAccounts (AccountID, UserID, BankName, Balance) VALUES
(1, 1, 'Vietcombank', 0.00),
(2, 1, 'Techcombank', 0.00),
(3, 2, 'BIDV', 0.00),
(4, 3, 'ACB', 0.00),
(5, 4, 'MB Bank', 0.00),
(6, 5, 'VietinBank', 0.00),
(7, 5, 'TPBank', 0.00);

-- 4) INCOME
INSERT INTO Income (IncomeID, UserID, AccountID, Amount, IncomeDate, Description) VALUES
(1, 1, 1, 18000000.00, '2026-03-01', 'Monthly salary'),
(2, 1, 2, 3500000.00, '2026-03-15', 'Freelance design project'),
(3, 1, 1, 1500000.00, '2026-03-20', 'Family support'),
(4, 2, 3, 14000000.00, '2026-03-01', 'Monthly salary'),
(5, 2, 3, 2000000.00, '2026-03-18', 'Performance bonus'),
(6, 3, 4, 12000000.00, '2026-03-01', 'Monthly salary'),
(7, 3, 4, 2500000.00, '2026-03-22', 'Tutoring income'),
(8, 4, 5, 20000000.00, '2026-03-01', 'Monthly salary'),
(9, 5, 6, 16000000.00, '2026-03-01', 'Monthly salary'),
(10, 5, 7, 4200000.00, '2026-03-24', 'Online business income');

-- 5) EXPENSES
INSERT INTO Expenses (ExpenseID, UserID, AccountID, CategoryID, Amount, ExpenseDate, Description) VALUES
(1, 1, 1, 8, 3200000.00, '2026-03-05', 'Monthly room rent'),
(2, 1, 1, 1, 850000.00, '2026-03-08', 'Groceries and meals'),
(3, 1, 1, 7, 1200000.00, '2026-03-12', 'Electricity and water bill'),
(4, 1, 2, 4, 450000.00, '2026-03-18', 'Cinema and coffee'),
(5, 2, 3, 8, 4200000.00, '2026-03-06', 'Apartment rent'),
(6, 2, 3, 2, 350000.00, '2026-03-14', 'Fuel and parking'),
(7, 3, 4, 6, 450000.00, '2026-03-11', 'Medical checkup'),
(8, 4, 5, 3, 1200000.00, '2026-03-25', 'English course fee'),
(9, 5, 6, 8, 3000000.00, '2026-03-04', 'House rent'),
(10, 5, 7, 5, 550000.00, '2026-03-21', 'Clothing purchase');

-- 6) ĐỒNG BỘ SỐ DƯ TÀI KHOẢN TỪ GIAO DỊCH
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

-- Legacy file kept for compatibility.
-- Canonical query file: database/queries.sql

USE Personal_Finance;

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

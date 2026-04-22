-- Canonical stored procedures for inserting financial transactions.
-- Keep the database name exactly as Personal_Finance.

USE Personal_Finance;

DROP PROCEDURE IF EXISTS sp_add_income;
DROP PROCEDURE IF EXISTS sp_add_expense;
DROP PROCEDURE IF EXISTS sp_update_income;
DROP PROCEDURE IF EXISTS sp_update_expense;
DROP PROCEDURE IF EXISTS sp_monthly_closure_summary;
DROP PROCEDURE IF EXISTS sp_add_budget_plan;
DROP PROCEDURE IF EXISTS sp_update_budget_plan;
DROP PROCEDURE IF EXISTS sp_delete_income;
DROP PROCEDURE IF EXISTS sp_delete_expense;

DELIMITER $$

-- Procedure 1: sp_add_income
-- Inserts one row into Income.
-- Note: BankAccounts.Balance is NOT updated here because triggers handle it.
-- Note: IncomeDate is system-generated inside database (CURRENT_TIMESTAMP).
CREATE PROCEDURE sp_add_income(
    IN p_user_id INT,
    IN p_account_id INT,
    IN p_amount DECIMAL(15,2),
    IN p_description VARCHAR(255)
)
BEGIN
    INSERT INTO Income (
        UserID,
        AccountID,
        Amount,
        IncomeDate,
        Description
    )
    VALUES (
        p_user_id,
        p_account_id,
        p_amount,
        CURRENT_TIMESTAMP,
        p_description
    );
END$$

-- Procedure 2: sp_add_expense
-- Inserts one row into Expenses.
-- Note: BankAccounts.Balance is NOT updated here because triggers handle it.
-- Note: Insufficient balance is rejected by BEFORE trigger at DB level.
-- Note: ExpenseDate is system-generated inside database (CURRENT_TIMESTAMP).
CREATE PROCEDURE sp_add_expense(
    IN p_user_id INT,
    IN p_account_id INT,
    IN p_category_id INT,
    IN p_amount DECIMAL(15,2),
    IN p_description VARCHAR(255)
)
BEGIN
    INSERT INTO Expenses (
        UserID,
        AccountID,
        CategoryID,
        Amount,
        ExpenseDate,
        Description
    )
    VALUES (
        p_user_id,
        p_account_id,
        p_category_id,
        p_amount,
        CURRENT_TIMESTAMP,
        p_description
    );
END$$

-- Procedure 3: sp_update_income
-- Updates one Income transaction by IncomeID.
-- Note: BankAccounts.Balance is NOT updated here because triggers handle it.
-- Note: IncomeDate is immutable in this task and is NOT updated.
CREATE PROCEDURE sp_update_income(
    IN p_income_id INT,
    IN p_user_id INT,
    IN p_account_id INT,
    IN p_amount DECIMAL(15,2),
    IN p_description VARCHAR(255)
)
BEGIN
    UPDATE Income
    SET
        UserID = p_user_id,
        AccountID = p_account_id,
        Amount = p_amount,
        Description = p_description
    WHERE IncomeID = p_income_id;
END$$

-- Procedure 4: sp_update_expense
-- Updates one Expense transaction by ExpenseID.
-- Note: BankAccounts.Balance is NOT updated here because triggers handle it.
-- Note: Insufficient balance is rejected by BEFORE trigger at DB level.
-- Note: ExpenseDate is immutable in this task and is NOT updated.
CREATE PROCEDURE sp_update_expense(
    IN p_expense_id INT,
    IN p_user_id INT,
    IN p_account_id INT,
    IN p_category_id INT,
    IN p_amount DECIMAL(15,2),
    IN p_description VARCHAR(255)
)
BEGIN
    UPDATE Expenses
    SET
        UserID = p_user_id,
        AccountID = p_account_id,
        CategoryID = p_category_id,
        Amount = p_amount,
        Description = p_description
    WHERE ExpenseID = p_expense_id;
END$$

-- Procedure 5: sp_monthly_closure_summary
-- Monthly closure support:
-- Returns monthly income, monthly expense, and net saving for a given year/month.
CREATE PROCEDURE sp_monthly_closure_summary(
    IN p_year INT,
    IN p_month INT
)
BEGIN
    SELECT
        CONCAT(p_year, '-', LPAD(p_month, 2, '0')) AS YearMonth,
        COALESCE(i.MonthlyIncome, 0) AS MonthlyIncome,
        COALESCE(e.MonthlyExpense, 0) AS MonthlyExpense,
        COALESCE(i.MonthlyIncome, 0) - COALESCE(e.MonthlyExpense, 0) AS NetSaving
    FROM (
        SELECT 1 AS k
    ) anchor
    LEFT JOIN (
        SELECT
            SUM(Amount) AS MonthlyIncome
        FROM Income
        WHERE YEAR(IncomeDate) = p_year
          AND MONTH(IncomeDate) = p_month
    ) i ON anchor.k = 1
    LEFT JOIN (
        SELECT
            SUM(Amount) AS MonthlyExpense
        FROM Expenses
        WHERE YEAR(ExpenseDate) = p_year
          AND MONTH(ExpenseDate) = p_month
    ) e ON anchor.k = 1;
END$$

-- Procedure 6: sp_add_budget_plan
-- Inserts one row into BudgetPlans.
CREATE PROCEDURE sp_add_budget_plan(
    IN p_user_id INT,
    IN p_category_id INT,
    IN p_budget_year SMALLINT,
    IN p_budget_month TINYINT,
    IN p_planned_amount DECIMAL(15,2),
    IN p_warning_percent DECIMAL(5,2)
)
BEGIN
    INSERT INTO BudgetPlans (
        UserID,
        CategoryID,
        BudgetYear,
        BudgetMonth,
        PlannedAmount,
        WarningPercent
    )
    VALUES (
        p_user_id,
        p_category_id,
        p_budget_year,
        p_budget_month,
        p_planned_amount,
        p_warning_percent
    );
END$$

-- Procedure 7: sp_update_budget_plan
-- Updates one budget plan by BudgetID.
CREATE PROCEDURE sp_update_budget_plan(
    IN p_budget_id INT,
    IN p_user_id INT,
    IN p_category_id INT,
    IN p_budget_year SMALLINT,
    IN p_budget_month TINYINT,
    IN p_planned_amount DECIMAL(15,2),
    IN p_warning_percent DECIMAL(5,2)
)
BEGIN
    UPDATE BudgetPlans
    SET
        UserID = p_user_id,
        CategoryID = p_category_id,
        BudgetYear = p_budget_year,
        BudgetMonth = p_budget_month,
        PlannedAmount = p_planned_amount,
        WarningPercent = p_warning_percent
    WHERE BudgetID = p_budget_id;
END$$

-- Procedure 8: sp_delete_income
-- Deletes one Income transaction by IncomeID.
-- Note: BankAccounts.Balance is NOT updated here because delete triggers handle it.
CREATE PROCEDURE sp_delete_income(
    IN p_income_id INT
)
BEGIN
    DELETE FROM Income
    WHERE IncomeID = p_income_id;
END$$

-- Procedure 9: sp_delete_expense
-- Deletes one Expense transaction by ExpenseID.
-- Note: BankAccounts.Balance is NOT updated here because delete triggers handle it.
CREATE PROCEDURE sp_delete_expense(
    IN p_expense_id INT
)
BEGIN
    DELETE FROM Expenses
    WHERE ExpenseID = p_expense_id;
END$$

DELIMITER ;

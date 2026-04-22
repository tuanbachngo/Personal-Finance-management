-- Canonical SQL functions for user-level financial summaries.
-- Keep the database name exactly as Personal_Finance.

USE Personal_Finance;

DROP FUNCTION IF EXISTS fn_total_income_by_user;
DROP FUNCTION IF EXISTS fn_total_expense_by_user;
DROP FUNCTION IF EXISTS fn_net_saving_by_user;
DROP FUNCTION IF EXISTS fn_calculated_balance_by_account;

DELIMITER $$

-- Function 1: fn_total_income_by_user(p_user_id INT)
-- Returns the user's total income amount.
-- If the user has no income rows, this function returns 0.
CREATE FUNCTION fn_total_income_by_user(p_user_id INT)
RETURNS DECIMAL(15,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_total_income DECIMAL(15,2);

    SELECT COALESCE(SUM(Amount), 0)
    INTO v_total_income
    FROM Income
    WHERE UserID = p_user_id;

    RETURN v_total_income;
END$$

-- Function 2: fn_total_expense_by_user(p_user_id INT)
-- Returns the user's total expense amount.
-- If the user has no expense rows, this function returns 0.
CREATE FUNCTION fn_total_expense_by_user(p_user_id INT)
RETURNS DECIMAL(15,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_total_expense DECIMAL(15,2);

    SELECT COALESCE(SUM(Amount), 0)
    INTO v_total_expense
    FROM Expenses
    WHERE UserID = p_user_id;

    RETURN v_total_expense;
END$$

-- Function 3: fn_net_saving_by_user(p_user_id INT)
-- Returns net saving = total income - total expense for a user.
-- If the user has no matching rows, both sides are treated as 0.
CREATE FUNCTION fn_net_saving_by_user(p_user_id INT)
RETURNS DECIMAL(15,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_total_income DECIMAL(15,2);
    DECLARE v_total_expense DECIMAL(15,2);

    SELECT COALESCE(SUM(Amount), 0)
    INTO v_total_income
    FROM Income
    WHERE UserID = p_user_id;

    SELECT COALESCE(SUM(Amount), 0)
    INTO v_total_expense
    FROM Expenses
    WHERE UserID = p_user_id;

    RETURN v_total_income - v_total_expense;
END$$

-- Function 4: fn_calculated_balance_by_account(p_user_id INT, p_account_id INT)
-- Returns account balance calculated from transactions:
-- total income - total expense for the given UserID + AccountID pair.
CREATE FUNCTION fn_calculated_balance_by_account(
    p_user_id INT,
    p_account_id INT
)
RETURNS DECIMAL(15,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_total_income DECIMAL(15,2);
    DECLARE v_total_expense DECIMAL(15,2);

    SELECT COALESCE(SUM(Amount), 0)
    INTO v_total_income
    FROM Income
    WHERE UserID = p_user_id
      AND AccountID = p_account_id;

    SELECT COALESCE(SUM(Amount), 0)
    INTO v_total_expense
    FROM Expenses
    WHERE UserID = p_user_id
      AND AccountID = p_account_id;

    RETURN v_total_income - v_total_expense;
END$$

DELIMITER ;

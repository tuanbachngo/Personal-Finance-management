-- Canonical triggers for automatic BankAccounts balance updates.
-- Keep compatibility with the current Personal_Finance schema.

USE Personal_Finance;

DROP TRIGGER IF EXISTS trg_expenses_before_insert_check_balance;
DROP TRIGGER IF EXISTS trg_expenses_before_update_check_balance;
DROP TRIGGER IF EXISTS trg_income_after_insert_update_balance;
DROP TRIGGER IF EXISTS trg_income_after_update_update_balance;
DROP TRIGGER IF EXISTS trg_income_after_delete_update_balance;
DROP TRIGGER IF EXISTS trg_expenses_after_insert_update_balance;
DROP TRIGGER IF EXISTS trg_expenses_after_update_update_balance;
DROP TRIGGER IF EXISTS trg_expenses_after_delete_update_balance;

DELIMITER $$

-- Trigger 0:
-- Before inserting an expense transaction, ensure account balance is sufficient.
CREATE TRIGGER trg_expenses_before_insert_check_balance
BEFORE INSERT ON Expenses
FOR EACH ROW
BEGIN
    DECLARE v_balance DECIMAL(15,2);

    SELECT Balance
    INTO v_balance
    FROM BankAccounts
    WHERE AccountID = NEW.AccountID
      AND UserID = NEW.UserID;

    IF v_balance IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Invalid account for this expense transaction';
    END IF;

    IF v_balance < NEW.Amount THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Insufficient balance for this expense transaction';
    END IF;
END$$

-- Trigger 0.1:
-- Before updating an expense transaction, ensure destination account balance is sufficient.
CREATE TRIGGER trg_expenses_before_update_check_balance
BEFORE UPDATE ON Expenses
FOR EACH ROW
BEGIN
    DECLARE v_available_balance DECIMAL(15,2);

    SELECT Balance
    INTO v_available_balance
    FROM BankAccounts
    WHERE AccountID = NEW.AccountID
      AND UserID = NEW.UserID;

    IF v_available_balance IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Invalid account for this expense transaction';
    END IF;

    -- If account/user pair does not change, OLD.Amount will be added back by AFTER UPDATE trigger.
    IF OLD.AccountID = NEW.AccountID AND OLD.UserID = NEW.UserID THEN
        SET v_available_balance = v_available_balance + OLD.Amount;
    END IF;

    IF v_available_balance < NEW.Amount THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Insufficient balance for this expense transaction';
    END IF;
END$$

-- Trigger 1:
-- After inserting an income transaction, add NEW.Amount to the related account balance.
CREATE TRIGGER trg_income_after_insert_update_balance
AFTER INSERT ON Income
FOR EACH ROW
BEGIN
    UPDATE BankAccounts
    SET Balance = Balance + NEW.Amount
    WHERE AccountID = NEW.AccountID
      AND UserID = NEW.UserID;
END$$

-- Trigger 2:
-- After updating an income transaction, apply old/new delta to balances.
CREATE TRIGGER trg_income_after_update_update_balance
AFTER UPDATE ON Income
FOR EACH ROW
BEGIN
    IF OLD.AccountID = NEW.AccountID AND OLD.UserID = NEW.UserID THEN
        -- Same account: update by delta in one step to avoid temporary invalid balance.
        UPDATE BankAccounts
        SET Balance = Balance + (NEW.Amount - OLD.Amount)
        WHERE AccountID = NEW.AccountID
          AND UserID = NEW.UserID;
    ELSE
        -- Different account/user pair: remove old impact, then apply new impact.
        UPDATE BankAccounts
        SET Balance = Balance - OLD.Amount
        WHERE AccountID = OLD.AccountID
          AND UserID = OLD.UserID;

        UPDATE BankAccounts
        SET Balance = Balance + NEW.Amount
        WHERE AccountID = NEW.AccountID
          AND UserID = NEW.UserID;
    END IF;
END$$

-- Trigger 3:
-- After deleting an income transaction, subtract OLD.Amount from balance.
CREATE TRIGGER trg_income_after_delete_update_balance
AFTER DELETE ON Income
FOR EACH ROW
BEGIN
    UPDATE BankAccounts
    SET Balance = Balance - OLD.Amount
    WHERE AccountID = OLD.AccountID
      AND UserID = OLD.UserID;
END$$

-- Trigger 4:
-- After inserting an expense transaction, subtract NEW.Amount from the related account balance.
CREATE TRIGGER trg_expenses_after_insert_update_balance
AFTER INSERT ON Expenses
FOR EACH ROW
BEGIN
    UPDATE BankAccounts
    SET Balance = Balance - NEW.Amount
    WHERE AccountID = NEW.AccountID
      AND UserID = NEW.UserID;
END$$

-- Trigger 5:
-- After updating an expense transaction, apply old/new delta to balances.
CREATE TRIGGER trg_expenses_after_update_update_balance
AFTER UPDATE ON Expenses
FOR EACH ROW
BEGIN
    UPDATE BankAccounts
    SET Balance = Balance + OLD.Amount
    WHERE AccountID = OLD.AccountID
      AND UserID = OLD.UserID;

    UPDATE BankAccounts
    SET Balance = Balance - NEW.Amount
    WHERE AccountID = NEW.AccountID
      AND UserID = NEW.UserID;
END$$

-- Trigger 6:
-- After deleting an expense transaction, add OLD.Amount back to balance.
CREATE TRIGGER trg_expenses_after_delete_update_balance
AFTER DELETE ON Expenses
FOR EACH ROW
BEGIN
    UPDATE BankAccounts
    SET Balance = Balance + OLD.Amount
    WHERE AccountID = OLD.AccountID
      AND UserID = OLD.UserID;
END$$

DELIMITER ;

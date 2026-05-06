-- Extend BudgetSettings with recurring fixed-expense items JSON payload.
-- Safe to re-run on existing Personal_Finance.

USE Personal_Finance;

DROP PROCEDURE IF EXISTS migrate_budget_settings_recurring_items;
DELIMITER //
CREATE PROCEDURE migrate_budget_settings_recurring_items()
BEGIN
    DECLARE has_fixed_items_json INT DEFAULT 0;

    SELECT COUNT(*)
    INTO has_fixed_items_json
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'BudgetSettings'
      AND COLUMN_NAME = 'FixedExpenseItemsJson';

    IF has_fixed_items_json = 0 THEN
        ALTER TABLE BudgetSettings
            ADD COLUMN FixedExpenseItemsJson JSON NULL AFTER FixedExpenseEstimate;
    END IF;
END//
DELIMITER ;

CALL migrate_budget_settings_recurring_items();
DROP PROCEDURE IF EXISTS migrate_budget_settings_recurring_items;

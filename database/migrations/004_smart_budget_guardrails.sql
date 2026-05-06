-- Adds Smart Budget guardrail structures without resetting existing data.
-- Safe to re-run on Personal_Finance.

USE Personal_Finance;

CREATE TABLE IF NOT EXISTS BudgetSettings (
    BudgetSettingID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT NOT NULL,
    BudgetYear SMALLINT NOT NULL,
    BudgetMonth TINYINT NOT NULL,
    ExpectedIncome DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    FixedExpenseEstimate DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    GoalContributionTarget DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    EmergencyBuffer DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_budget_settings_year CHECK (BudgetYear >= 2000),
    CONSTRAINT chk_budget_settings_month CHECK (BudgetMonth BETWEEN 1 AND 12),
    CONSTRAINT chk_expected_income CHECK (ExpectedIncome >= 0),
    CONSTRAINT chk_fixed_expense_estimate CHECK (FixedExpenseEstimate >= 0),
    CONSTRAINT chk_goal_contribution_target CHECK (GoalContributionTarget >= 0),
    CONSTRAINT chk_emergency_buffer CHECK (EmergencyBuffer >= 0),
    CONSTRAINT uq_budget_settings_user_period UNIQUE (UserID, BudgetYear, BudgetMonth),
    CONSTRAINT fk_budget_settings_user
        FOREIGN KEY (UserID)
        REFERENCES Users(UserID)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

DROP PROCEDURE IF EXISTS migrate_smart_budget_guardrails;
DELIMITER //
CREATE PROCEDURE migrate_smart_budget_guardrails()
BEGIN
    DECLARE has_soft_locked INT DEFAULT 0;
    DECLARE has_priority INT DEFAULT 0;
    DECLARE has_notes INT DEFAULT 0;

    SELECT COUNT(*)
    INTO has_soft_locked
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'BudgetPlans'
      AND COLUMN_NAME = 'IsSoftLocked';

    IF has_soft_locked = 0 THEN
        ALTER TABLE BudgetPlans
            ADD COLUMN IsSoftLocked TINYINT(1) NOT NULL DEFAULT 0 AFTER WarningPercent;
    END IF;

    SELECT COUNT(*)
    INTO has_priority
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'BudgetPlans'
      AND COLUMN_NAME = 'BudgetPriority';

    IF has_priority = 0 THEN
        ALTER TABLE BudgetPlans
            ADD COLUMN BudgetPriority ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL DEFAULT 'MEDIUM' AFTER IsSoftLocked;
    END IF;

    SELECT COUNT(*)
    INTO has_notes
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'BudgetPlans'
      AND COLUMN_NAME = 'Notes';

    IF has_notes = 0 THEN
        ALTER TABLE BudgetPlans
            ADD COLUMN Notes VARCHAR(255) NULL AFTER BudgetPriority;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'BudgetSettings'
          AND INDEX_NAME = 'idx_budgetsettings_user_period'
    ) THEN
        CREATE INDEX idx_budgetsettings_user_period
            ON BudgetSettings(UserID, BudgetYear, BudgetMonth);
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'BudgetPlans'
          AND INDEX_NAME = 'idx_budgetplans_softlock_priority'
    ) THEN
        CREATE INDEX idx_budgetplans_softlock_priority
            ON BudgetPlans(UserID, BudgetYear, BudgetMonth, IsSoftLocked, BudgetPriority);
    END IF;
END//
DELIMITER ;

CALL migrate_smart_budget_guardrails();
DROP PROCEDURE IF EXISTS migrate_smart_budget_guardrails;

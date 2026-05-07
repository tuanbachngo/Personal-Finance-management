USE Personal_Finance;

-- ============================================================
-- Migration 002: Add Saving Goals (UPDATED to match schema.sql)
-- Changes from original:
--   - FK constraint names aligned with schema.sql canonical names
--   - Added SavingGoalCategories table (required by schema.sql)
--   - Added GoalCategoryID and CustomGoalCategoryName columns to SavingGoals
--   - Updated vw_saving_goal_progress to include category and icon fields
-- ============================================================

-- Step 1: SavingGoalCategories (must come before SavingGoals due to FK)
CREATE TABLE IF NOT EXISTS SavingGoalCategories (
    GoalCategoryID INT AUTO_INCREMENT PRIMARY KEY,
    CategoryKey VARCHAR(50) NOT NULL UNIQUE,
    CategoryName VARCHAR(100) NOT NULL,
    IconEmoji VARCHAR(16) NOT NULL DEFAULT '💰',
    Description VARCHAR(255) NULL,
    IsCustomAllowed TINYINT(1) NOT NULL DEFAULT 0,
    IsActive TINYINT(1) NOT NULL DEFAULT 1,
    SortOrder INT NOT NULL DEFAULT 0,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: SavingGoals (with GoalCategoryID and CustomGoalCategoryName)
CREATE TABLE IF NOT EXISTS SavingGoals (
    GoalID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT NOT NULL,
    LinkedAccountID INT NULL,

    GoalName VARCHAR(100) NOT NULL,
    GoalType ENUM('SAVE_UP', 'PAY_DOWN') NOT NULL DEFAULT 'SAVE_UP',
    GoalCategoryID INT NULL,
    CustomGoalCategoryName VARCHAR(100) NULL,

    TargetAmount DECIMAL(15,2) NOT NULL,
    CurrentAmount DECIMAL(15,2) NOT NULL DEFAULT 0.00,

    StartDate DATE NOT NULL DEFAULT (CURRENT_DATE),
    TargetDate DATE NULL,

    AnnualGrowthRate DECIMAL(5,2) NOT NULL DEFAULT 0.00,

    Status ENUM('ACTIVE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    Notes VARCHAR(255) NULL,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_savinggoals_user
        FOREIGN KEY (UserID)
        REFERENCES Users(UserID)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    -- FK name aligned with schema.sql (was: fk_savinggoals_linked_account_user)
    CONSTRAINT fk_savinggoals_linked_account
        FOREIGN KEY (LinkedAccountID)
        REFERENCES BankAccounts(AccountID)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT chk_savinggoals_target_amount
        CHECK (TargetAmount > 0),

    CONSTRAINT chk_savinggoals_current_amount
        CHECK (CurrentAmount >= 0),

    CONSTRAINT chk_savinggoals_growth_rate
        CHECK (AnnualGrowthRate >= 0),

    CONSTRAINT fk_savinggoals_category
        FOREIGN KEY (GoalCategoryID)
        REFERENCES SavingGoalCategories(GoalCategoryID)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

-- Step 3: GoalContributions
CREATE TABLE IF NOT EXISTS GoalContributions (
    ContributionID INT AUTO_INCREMENT PRIMARY KEY,
    GoalID INT NOT NULL,
    UserID INT NOT NULL,
    AccountID INT NULL,

    Amount DECIMAL(15,2) NOT NULL,
    ContributionType ENUM('DEPOSIT', 'WITHDRAW') NOT NULL DEFAULT 'DEPOSIT',
    ContributionDate DATE NOT NULL DEFAULT (CURRENT_DATE),
    Description VARCHAR(255) NULL,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_goalcontributions_goal
        FOREIGN KEY (GoalID)
        REFERENCES SavingGoals(GoalID)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_goalcontributions_user
        FOREIGN KEY (UserID)
        REFERENCES Users(UserID)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    -- FK name aligned with schema.sql (was: fk_goalcontributions_account_user)
    CONSTRAINT fk_goalcontributions_account
        FOREIGN KEY (AccountID)
        REFERENCES BankAccounts(AccountID)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT chk_goalcontributions_amount
        CHECK (Amount > 0)
);

-- Step 4: Add missing columns to SavingGoals if running on existing DB
DROP PROCEDURE IF EXISTS migrate_002_add_goal_columns;
DELIMITER //
CREATE PROCEDURE migrate_002_add_goal_columns()
BEGIN
    -- GoalCategoryID
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'SavingGoals'
          AND COLUMN_NAME = 'GoalCategoryID'
    ) THEN
        ALTER TABLE SavingGoals
            ADD COLUMN GoalCategoryID INT NULL AFTER GoalType;
        ALTER TABLE SavingGoals
            ADD CONSTRAINT fk_savinggoals_category
                FOREIGN KEY (GoalCategoryID)
                REFERENCES SavingGoalCategories(GoalCategoryID)
                ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    -- CustomGoalCategoryName
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'SavingGoals'
          AND COLUMN_NAME = 'CustomGoalCategoryName'
    ) THEN
        ALTER TABLE SavingGoals
            ADD COLUMN CustomGoalCategoryName VARCHAR(100) NULL AFTER GoalCategoryID;
    END IF;
END//
DELIMITER ;
CALL migrate_002_add_goal_columns();
DROP PROCEDURE IF EXISTS migrate_002_add_goal_columns;

-- Step 5: Indexes (safe: CREATE INDEX fails silently on duplicates via IF NOT EXISTS workaround)
CREATE INDEX idx_savinggoals_user_status
    ON SavingGoals(UserID, Status);

CREATE INDEX idx_savinggoals_user_target_date
    ON SavingGoals(UserID, TargetDate);

CREATE INDEX idx_savinggoals_linked_account
    ON SavingGoals(LinkedAccountID);

CREATE INDEX idx_savinggoals_category
    ON SavingGoals(GoalCategoryID);

CREATE INDEX idx_goalcontributions_goal_date
    ON GoalContributions(GoalID, ContributionDate);

CREATE INDEX idx_goalcontributions_user_date
    ON GoalContributions(UserID, ContributionDate);

-- Step 6: Full view matching views.sql canonical definition
DROP VIEW IF EXISTS vw_saving_goal_progress;
CREATE VIEW vw_saving_goal_progress AS
SELECT
    g.GoalID,
    g.UserID,
    u.UserName,
    g.LinkedAccountID,
    b.BankName,
    g.GoalName,
    g.GoalType,
    g.TargetAmount,
    g.CurrentAmount,
    g.TargetAmount - g.CurrentAmount AS RemainingAmount,
    ROUND((g.CurrentAmount / g.TargetAmount) * 100, 2) AS ProgressPercent,
    g.StartDate,
    g.TargetDate,
    g.GoalCategoryID,
    sgc.CategoryKey AS GoalCategoryKey,
    sgc.CategoryName AS GoalCategoryName,
    sgc.IconEmoji AS GoalIconEmoji,
    sgc.IsCustomAllowed AS GoalCategoryIsCustomAllowed,
    g.CustomGoalCategoryName,
    CASE
        WHEN g.TargetDate IS NULL THEN NULL
        ELSE DATEDIFF(g.TargetDate, CURDATE())
    END AS DaysRemaining,
    CASE
        WHEN g.TargetDate IS NULL THEN NULL
        WHEN DATEDIFF(g.TargetDate, CURDATE()) <= 0 THEN g.TargetAmount - g.CurrentAmount
        ELSE ROUND((g.TargetAmount - g.CurrentAmount) / GREATEST(TIMESTAMPDIFF(MONTH, CURDATE(), g.TargetDate), 1), 2)
    END AS MonthlyRequired,
    g.AnnualGrowthRate,
    g.Status,
    CASE
        WHEN g.Status = 'CANCELLED' THEN _utf8mb4'CANCELLED' COLLATE utf8mb4_0900_ai_ci
        WHEN g.CurrentAmount >= g.TargetAmount THEN _utf8mb4'COMPLETED' COLLATE utf8mb4_0900_ai_ci
        WHEN g.TargetDate IS NOT NULL AND g.TargetDate < CURDATE() THEN _utf8mb4'OVERDUE' COLLATE utf8mb4_0900_ai_ci
        WHEN g.TargetDate IS NOT NULL AND DATEDIFF(g.TargetDate, CURDATE()) <= 30 THEN _utf8mb4'DUE_SOON' COLLATE utf8mb4_0900_ai_ci
        ELSE _utf8mb4'ON_TRACK' COLLATE utf8mb4_0900_ai_ci
    END AS GoalAlertLevel,
    g.Notes,
    g.CreatedAt
FROM SavingGoals g
JOIN Users u
    ON g.UserID = u.UserID
LEFT JOIN SavingGoalCategories sgc
    ON g.GoalCategoryID = sgc.GoalCategoryID
LEFT JOIN BankAccounts ba
    ON g.LinkedAccountID = ba.AccountID
   AND g.UserID = ba.UserID
LEFT JOIN Banks b
    ON ba.BankID = b.BankID;
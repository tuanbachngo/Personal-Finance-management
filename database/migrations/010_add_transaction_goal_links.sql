USE Personal_Finance;
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS TransactionGoalLinks (
    LinkID BIGINT AUTO_INCREMENT PRIMARY KEY,
    UserID INT NOT NULL,
    GoalID INT NOT NULL,
    ContributionID INT NOT NULL,
    SourceType ENUM('INCOME', 'EXPENSE') NOT NULL,
    SourceTransactionID INT NOT NULL,
    ContributionType ENUM('DEPOSIT', 'WITHDRAW') NOT NULL,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_txngoallinks_user
        FOREIGN KEY (UserID)
        REFERENCES Users(UserID)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_txngoallinks_goal
        FOREIGN KEY (GoalID)
        REFERENCES SavingGoals(GoalID)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_txngoallinks_contribution
        FOREIGN KEY (ContributionID)
        REFERENCES GoalContributions(ContributionID)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT uq_txngoallinks_source UNIQUE (SourceType, SourceTransactionID),
    CONSTRAINT uq_txngoallinks_contribution UNIQUE (ContributionID)
);

SET @idx_user_source_exists := (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = 'Personal_Finance'
      AND table_name = 'TransactionGoalLinks'
      AND index_name = 'idx_txngoallinks_user_source'
);
SET @idx_user_source_sql := IF(
    @idx_user_source_exists = 0,
    'CREATE INDEX idx_txngoallinks_user_source ON TransactionGoalLinks(UserID, SourceType, SourceTransactionID)',
    'SELECT 1'
);
PREPARE idx_stmt_1 FROM @idx_user_source_sql;
EXECUTE idx_stmt_1;
DEALLOCATE PREPARE idx_stmt_1;

SET @idx_goal_exists := (
    SELECT COUNT(*)
    FROM information_schema.statistics
    WHERE table_schema = 'Personal_Finance'
      AND table_name = 'TransactionGoalLinks'
      AND index_name = 'idx_txngoallinks_goal'
);
SET @idx_goal_sql := IF(
    @idx_goal_exists = 0,
    'CREATE INDEX idx_txngoallinks_goal ON TransactionGoalLinks(GoalID, CreatedAt)',
    'SELECT 1'
);
PREPARE idx_stmt_2 FROM @idx_goal_sql;
EXECUTE idx_stmt_2;
DEALLOCATE PREPARE idx_stmt_2;

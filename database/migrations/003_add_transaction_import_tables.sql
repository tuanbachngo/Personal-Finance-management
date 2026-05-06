-- Adds staging tables for manual bank statement import (CSV/Excel).
-- Safe to re-run on existing Personal_Finance database.

USE Personal_Finance;

CREATE TABLE IF NOT EXISTS TransactionImportBatches (
    BatchID BIGINT AUTO_INCREMENT PRIMARY KEY,
    UserID INT NOT NULL,
    AccountID INT NOT NULL,
    FileName VARCHAR(255) NULL,
    FileType ENUM('CSV', 'EXCEL') NOT NULL DEFAULT 'CSV',
    Status ENUM('PREVIEWED', 'CONFIRMED', 'PARTIAL', 'FAILED') NOT NULL DEFAULT 'PREVIEWED',
    TotalRows INT NOT NULL DEFAULT 0,
    ImportedRows INT NOT NULL DEFAULT 0,
    SkippedRows INT NOT NULL DEFAULT 0,
    FailedRows INT NOT NULL DEFAULT 0,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ConfirmedAt DATETIME NULL,
    CONSTRAINT fk_importbatches_user
        FOREIGN KEY (UserID)
        REFERENCES Users(UserID)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_importbatches_account_user
        FOREIGN KEY (AccountID, UserID)
        REFERENCES BankAccounts(AccountID, UserID)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS TransactionImportRows (
    RowID BIGINT AUTO_INCREMENT PRIMARY KEY,
    BatchID BIGINT NOT NULL,
    RowNumber INT NOT NULL,
    RawDate VARCHAR(64) NULL,
    RawDescription VARCHAR(255) NULL,
    RawAmount VARCHAR(64) NULL,
    RawType VARCHAR(32) NULL,
    ParsedDate DATE NULL,
    ParsedAmount DECIMAL(15,2) NULL,
    ParsedType ENUM('INCOME', 'EXPENSE') NULL,
    SuggestedCategoryID INT NULL,
    FinalCategoryID INT NULL,
    IsDuplicate TINYINT(1) NOT NULL DEFAULT 0,
    DuplicateHash CHAR(64) NULL,
    ActionType ENUM('IMPORT', 'SKIP') NOT NULL DEFAULT 'IMPORT',
    RowStatus ENUM('PREVIEW', 'IMPORTED', 'SKIPPED', 'FAILED') NOT NULL DEFAULT 'PREVIEW',
    ErrorMessage VARCHAR(255) NULL,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_importrows_batch
        FOREIGN KEY (BatchID)
        REFERENCES TransactionImportBatches(BatchID)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_importrows_suggested_category
        FOREIGN KEY (SuggestedCategoryID)
        REFERENCES ExpenseCategories(CategoryID)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    CONSTRAINT fk_importrows_final_category
        FOREIGN KEY (FinalCategoryID)
        REFERENCES ExpenseCategories(CategoryID)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS TransactionCategoryRules (
    RuleID BIGINT AUTO_INCREMENT PRIMARY KEY,
    UserID INT NULL,
    Keyword VARCHAR(100) NOT NULL,
    CategoryID INT NOT NULL,
    Priority INT NOT NULL DEFAULT 100,
    IsActive TINYINT(1) NOT NULL DEFAULT 1,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_txn_rules_user
        FOREIGN KEY (UserID)
        REFERENCES Users(UserID)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    CONSTRAINT fk_txn_rules_category
        FOREIGN KEY (CategoryID)
        REFERENCES ExpenseCategories(CategoryID)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

-- Canonical schema file for the Personal Finance Management System.
-- Keep the database name exactly as Personal_Finance.

DROP DATABASE IF EXISTS Personal_Finance;
CREATE DATABASE IF NOT EXISTS Personal_Finance;
USE Personal_Finance;

-- 1. USERS
CREATE TABLE Users (
    UserID INT AUTO_INCREMENT PRIMARY KEY,
    UserName VARCHAR(100) NOT NULL,
    Email VARCHAR(100) NOT NULL UNIQUE,
    PhoneNumber VARCHAR(20) UNIQUE
);

-- 2. USER CREDENTIALS (APP-LEVEL AUTH)
-- Keep auth data separate from profile table for minimal-impact extension.
CREATE TABLE UserCredentials (
    UserID INT PRIMARY KEY,
    PasswordHash VARCHAR(255) NOT NULL,
    PasswordSalt VARCHAR(255) NULL,
    HashAlgorithm ENUM('SHA256', 'PBKDF2_SHA256', 'ARGON2ID') NOT NULL DEFAULT 'SHA256',
    UserRole ENUM('ADMIN', 'USER') NOT NULL DEFAULT 'USER',
    IsActive TINYINT(1) NOT NULL DEFAULT 1,
    FailedLoginCount INT NOT NULL DEFAULT 0,
    LastFailedAt DATETIME NULL,
    LockUntil DATETIME NULL,
    LastLoginAt DATETIME NULL,
    RecoveryHint VARCHAR(255) NULL,
    RecoveryAnswerHash CHAR(64) NULL,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_usercredentials_user
        FOREIGN KEY (UserID)
        REFERENCES Users(UserID)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- 3. AUTH OTP CODES
CREATE TABLE AuthOtpCodes (
    OtpID BIGINT AUTO_INCREMENT PRIMARY KEY,
    UserID INT NOT NULL,
    OtpPurpose ENUM('UNLOCK', 'RESET_PASSWORD') NOT NULL,
    OtpSalt CHAR(16) NOT NULL,
    OtpCodeHash CHAR(64) NOT NULL,
    ExpiresAt DATETIME NOT NULL,
    AttemptCount INT NOT NULL DEFAULT 0,
    MaxAttempts INT NOT NULL DEFAULT 5,
    IsUsed TINYINT(1) NOT NULL DEFAULT 0,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_authotp_user
        FOREIGN KEY (UserID)
        REFERENCES Users(UserID)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- 4. AUTH AUDIT LOGS
CREATE TABLE AuthAuditLogs (
    AuditID BIGINT AUTO_INCREMENT PRIMARY KEY,
    UserID INT NULL,
    EmailAttempted VARCHAR(100) NULL,
    EventType VARCHAR(50) NOT NULL,
    EventDetail VARCHAR(255) NULL,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_authaudit_user
        FOREIGN KEY (UserID)
        REFERENCES Users(UserID)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

-- 5. AUTH SESSION TOKENS
CREATE TABLE AuthSessionTokens (
    SessionID BIGINT AUTO_INCREMENT PRIMARY KEY,
    UserID INT NOT NULL,
    TokenHash CHAR(64) NOT NULL UNIQUE,
    ExpiresAt DATETIME NOT NULL,
    LastSeenAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    RevokedAt DATETIME NULL,
    UserAgent VARCHAR(255) NULL,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_authsession_user
        FOREIGN KEY (UserID)
        REFERENCES Users(UserID)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- 6. EXPENSE CATEGORIES
CREATE TABLE ExpenseCategories (
    CategoryID INT AUTO_INCREMENT PRIMARY KEY,
    CategoryName VARCHAR(100) NOT NULL UNIQUE
);

-- 7. BANK CATALOG
CREATE TABLE Banks (
    BankID INT AUTO_INCREMENT PRIMARY KEY,
    BankCode VARCHAR(30) NOT NULL UNIQUE,
    BankName VARCHAR(100) NOT NULL UNIQUE,
    IsActive TINYINT(1) NOT NULL DEFAULT 1
);

-- 8. BANK ACCOUNTS
CREATE TABLE BankAccounts (
    AccountID INT AUTO_INCREMENT,
    UserID INT NOT NULL,
    BankID INT NOT NULL,
    Balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    PRIMARY KEY (AccountID),
    CONSTRAINT uq_bankaccounts_account_user UNIQUE (AccountID, UserID),
    CONSTRAINT uq_bankaccounts_user_bank UNIQUE (UserID, BankID),
    CONSTRAINT fk_bankaccounts_user
        FOREIGN KEY (UserID)
        REFERENCES Users(UserID)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_bankaccounts_bank
        FOREIGN KEY (BankID)
        REFERENCES Banks(BankID)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT chk_bankaccounts_balance
        CHECK (Balance >= 0)
);

-- 9. INCOME
CREATE TABLE Income (
    IncomeID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT NOT NULL,
    AccountID INT NOT NULL,
    Amount DECIMAL(15,2) NOT NULL,
    IncomeDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Description VARCHAR(255),
    CONSTRAINT chk_income_amount
        CHECK (Amount > 0),
    CONSTRAINT fk_income_user
        FOREIGN KEY (UserID)
        REFERENCES Users(UserID)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_income_account_user
        FOREIGN KEY (AccountID, UserID)
        REFERENCES BankAccounts(AccountID, UserID)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

-- 10. EXPENSES
CREATE TABLE Expenses (
    ExpenseID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT NOT NULL,
    AccountID INT NOT NULL,
    CategoryID INT NOT NULL,
    Amount DECIMAL(15,2) NOT NULL,
    ExpenseDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Description VARCHAR(255),
    CONSTRAINT chk_expenses_amount
        CHECK (Amount > 0),
    CONSTRAINT fk_expenses_user
        FOREIGN KEY (UserID)
        REFERENCES Users(UserID)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_expenses_category
        FOREIGN KEY (CategoryID)
        REFERENCES ExpenseCategories(CategoryID)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT fk_expenses_account_user
        FOREIGN KEY (AccountID, UserID)
        REFERENCES BankAccounts(AccountID, UserID)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

-- 11. BUDGET PLANNING
-- One budget plan per user + category + month.
CREATE TABLE BudgetPlans (
    BudgetID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT NOT NULL,
    CategoryID INT NOT NULL,
    BudgetYear SMALLINT NOT NULL,
    BudgetMonth TINYINT NOT NULL,
    PlannedAmount DECIMAL(15,2) NOT NULL,
    WarningPercent DECIMAL(5,2) NOT NULL DEFAULT 80.00,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_budget_year
        CHECK (BudgetYear >= 2000),
    CONSTRAINT chk_budget_month
        CHECK (BudgetMonth BETWEEN 1 AND 12),
    CONSTRAINT chk_planned_amount
        CHECK (PlannedAmount > 0),
    CONSTRAINT chk_warning_percent
        CHECK (WarningPercent > 0 AND WarningPercent <= 100),
    CONSTRAINT uq_budget_user_category_month
        UNIQUE (UserID, CategoryID, BudgetYear, BudgetMonth),
    CONSTRAINT fk_budgetplans_user
        FOREIGN KEY (UserID)
        REFERENCES Users(UserID)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_budgetplans_category
        FOREIGN KEY (CategoryID)
        REFERENCES ExpenseCategories(CategoryID)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

-- 12. PERFORMANCE INDEXES (REPORTING + COMMON FILTERS)
-- Keep these indexes additive only to preserve existing schema design.
CREATE INDEX idx_bankaccounts_userid ON BankAccounts(UserID);
CREATE INDEX idx_bankaccounts_bankid ON BankAccounts(BankID);
CREATE INDEX idx_banks_active_name ON Banks(IsActive, BankName);
CREATE INDEX idx_usercredentials_role_active ON UserCredentials(UserRole, IsActive);
CREATE INDEX idx_usercredentials_lock_until ON UserCredentials(LockUntil);
CREATE INDEX idx_usercredentials_last_login ON UserCredentials(LastLoginAt);

CREATE INDEX idx_authotp_user_purpose_created ON AuthOtpCodes(UserID, OtpPurpose, CreatedAt);
CREATE INDEX idx_authotp_expires_used ON AuthOtpCodes(ExpiresAt, IsUsed);
CREATE INDEX idx_authaudit_user_created ON AuthAuditLogs(UserID, CreatedAt);
CREATE INDEX idx_authsession_user_expires ON AuthSessionTokens(UserID, ExpiresAt);
CREATE INDEX idx_authsession_expires_revoked ON AuthSessionTokens(ExpiresAt, RevokedAt);

CREATE INDEX idx_income_user_date ON Income(UserID, IncomeDate);
CREATE INDEX idx_income_date ON Income(IncomeDate);

CREATE INDEX idx_expenses_user_date ON Expenses(UserID, ExpenseDate);
CREATE INDEX idx_expenses_category_date ON Expenses(CategoryID, ExpenseDate);
CREATE INDEX idx_expenses_date ON Expenses(ExpenseDate);

CREATE INDEX idx_budgetplans_user_period ON BudgetPlans(UserID, BudgetYear, BudgetMonth);
CREATE INDEX idx_budgetplans_category_period ON BudgetPlans(CategoryID, BudgetYear, BudgetMonth);

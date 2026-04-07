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

-- 2. EXPENSE CATEGORIES
CREATE TABLE ExpenseCategories (
    CategoryID INT AUTO_INCREMENT PRIMARY KEY,
    CategoryName VARCHAR(100) NOT NULL UNIQUE
);

-- 3. BANK ACCOUNTS
CREATE TABLE BankAccounts (
    AccountID INT AUTO_INCREMENT,
    UserID INT NOT NULL,
    BankName VARCHAR(100) NOT NULL,
    Balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    PRIMARY KEY (AccountID),
    CONSTRAINT uq_bankaccounts_account_user UNIQUE (AccountID, UserID),
    CONSTRAINT fk_bankaccounts_user
        FOREIGN KEY (UserID)
        REFERENCES Users(UserID)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT chk_bankaccounts_balance
        CHECK (Balance >= 0)
);

-- 4. INCOME
CREATE TABLE Income (
    IncomeID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT NOT NULL,
    AccountID INT NOT NULL,
    Amount DECIMAL(15,2) NOT NULL,
    IncomeDate DATE NOT NULL,
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

-- 5. EXPENSES
CREATE TABLE Expenses (
    ExpenseID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT NOT NULL,
    AccountID INT NOT NULL,
    CategoryID INT NOT NULL,
    Amount DECIMAL(15,2) NOT NULL,
    ExpenseDate DATE NOT NULL,
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

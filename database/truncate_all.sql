-- Truncate all tables in correct FK order before re-seeding
USE Personal_Finance;
SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE TransactionGoalLinks;
TRUNCATE TABLE GoalContributions;
TRUNCATE TABLE SavingGoals;
TRUNCATE TABLE SavingGoalCategories;
TRUNCATE TABLE TransactionCategoryRules;
TRUNCATE TABLE TransactionImportRows;
TRUNCATE TABLE TransactionImportBatches;
TRUNCATE TABLE BudgetPlans;
TRUNCATE TABLE BudgetSettings;
TRUNCATE TABLE Expenses;
TRUNCATE TABLE Income;
TRUNCATE TABLE BankAccounts;
TRUNCATE TABLE Banks;
TRUNCATE TABLE AuthSessionTokens;
TRUNCATE TABLE AuthAuditLogs;
TRUNCATE TABLE AuthOtpCodes;
TRUNCATE TABLE UserCredentials;
TRUNCATE TABLE Users;
TRUNCATE TABLE ExpenseCategories;

SET FOREIGN_KEY_CHECKS = 1;
SELECT 'All tables truncated successfully.' AS Status;

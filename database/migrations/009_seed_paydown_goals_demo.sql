-- Seed demo PAY_DOWN (debt repayment) goals and contributions.
-- Safe to run multiple times.

USE Personal_Finance;
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- 1) Credit card debt goal for each user (if missing)
INSERT INTO SavingGoals (
    UserID,
    LinkedAccountID,
    GoalName,
    GoalType,
    GoalCategoryID,
    CustomGoalCategoryName,
    TargetAmount,
    CurrentAmount,
    StartDate,
    TargetDate,
    AnnualGrowthRate,
    Status,
    Notes
)
SELECT
    u.UserID,
    ba.AccountID,
    'Nợ thẻ tín dụng',
    'PAY_DOWN',
    c.GoalCategoryID,
    NULL,
    18000000.00 + (u.UserID * 500000.00),
    3500000.00 + (u.UserID * 200000.00),
    DATE_SUB(CURDATE(), INTERVAL 2 MONTH),
    DATE_ADD(CURDATE(), INTERVAL 8 MONTH),
    0.00,
    'ACTIVE',
    'Mục tiêu giảm dần dư nợ thẻ tín dụng theo tháng.'
FROM Users u
JOIN (
    SELECT UserID, MIN(AccountID) AS AccountID
    FROM BankAccounts
    GROUP BY UserID
) ba
    ON ba.UserID = u.UserID
JOIN SavingGoalCategories c
    ON c.CategoryKey = 'OTHER'
WHERE NOT EXISTS (
    SELECT 1
    FROM SavingGoals g
    WHERE g.UserID = u.UserID
      AND g.GoalType = 'PAY_DOWN'
      AND g.GoalName = 'Nợ thẻ tín dụng'
);

-- 2) Extra debt goal for user 10 (if missing)
INSERT INTO SavingGoals (
    UserID,
    LinkedAccountID,
    GoalName,
    GoalType,
    GoalCategoryID,
    CustomGoalCategoryName,
    TargetAmount,
    CurrentAmount,
    StartDate,
    TargetDate,
    AnnualGrowthRate,
    Status,
    Notes
)
SELECT
    10,
    ba.AccountID,
    'Khoản vay mua xe',
    'PAY_DOWN',
    c.GoalCategoryID,
    NULL,
    90000000.00,
    12000000.00,
    DATE_SUB(CURDATE(), INTERVAL 3 MONTH),
    DATE_ADD(CURDATE(), INTERVAL 24 MONTH),
    0.00,
    'ACTIVE',
    'Khoản vay dài hạn, theo dõi tiến độ trả nợ định kỳ.'
FROM (
    SELECT MIN(AccountID) AS AccountID
    FROM BankAccounts
    WHERE UserID = 10
) ba
JOIN SavingGoalCategories c
    ON c.CategoryKey = 'CAR'
WHERE ba.AccountID IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM SavingGoals g
      WHERE g.UserID = 10
        AND g.GoalType = 'PAY_DOWN'
        AND g.GoalName = 'Khoản vay mua xe'
  );

-- 3) Contributions for debt goals (if missing)
INSERT INTO GoalContributions (
    GoalID,
    UserID,
    AccountID,
    Amount,
    ContributionType,
    ContributionDate,
    Description
)
SELECT
    g.GoalID,
    g.UserID,
    g.LinkedAccountID,
    1200000.00,
    'DEPOSIT',
    DATE_SUB(CURDATE(), INTERVAL 20 DAY),
    'Thanh toán nợ kỳ gần nhất'
FROM SavingGoals g
WHERE g.GoalType = 'PAY_DOWN'
  AND g.GoalName = 'Nợ thẻ tín dụng'
  AND NOT EXISTS (
      SELECT 1
      FROM GoalContributions gc
      WHERE gc.GoalID = g.GoalID
        AND gc.Description = 'Thanh toán nợ kỳ gần nhất'
  );

INSERT INTO GoalContributions (
    GoalID,
    UserID,
    AccountID,
    Amount,
    ContributionType,
    ContributionDate,
    Description
)
SELECT
    g.GoalID,
    g.UserID,
    g.LinkedAccountID,
    2500000.00,
    'DEPOSIT',
    DATE_SUB(CURDATE(), INTERVAL 10 DAY),
    'Thanh toán trả nợ khoản vay xe'
FROM SavingGoals g
WHERE g.GoalType = 'PAY_DOWN'
  AND g.GoalName = 'Khoản vay mua xe'
  AND g.UserID = 10
  AND NOT EXISTS (
      SELECT 1
      FROM GoalContributions gc
      WHERE gc.GoalID = g.GoalID
        AND gc.Description = 'Thanh toán trả nợ khoản vay xe'
  );

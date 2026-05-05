USE Personal_Finance;

INSERT INTO SavingGoals (
    UserID,
    LinkedAccountID,
    GoalName,
    GoalType,
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
    MIN(ba.AccountID),
    'Emergency Fund',
    'SAVE_UP',
    50000000.00,
    8000000.00,
    CURDATE(),
    DATE_ADD(CURDATE(), INTERVAL 10 MONTH),
    0.00,
    'ACTIVE',
    'Build a safety fund for unexpected expenses.'
FROM Users u
JOIN BankAccounts ba ON u.UserID = ba.UserID
GROUP BY u.UserID
LIMIT 1;

INSERT INTO SavingGoals (
    UserID,
    LinkedAccountID,
    GoalName,
    GoalType,
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
    MIN(ba.AccountID),
    'Buy a Laptop',
    'SAVE_UP',
    25000000.00,
    10000000.00,
    CURDATE(),
    DATE_ADD(CURDATE(), INTERVAL 5 MONTH),
    0.00,
    'ACTIVE',
    'Personal technology upgrade goal.'
FROM Users u
JOIN BankAccounts ba ON u.UserID = ba.UserID
GROUP BY u.UserID
LIMIT 1;

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
    2000000.00,
    'DEPOSIT',
    CURDATE(),
    'Initial goal contribution'
FROM SavingGoals g
WHERE g.GoalName IN ('Emergency Fund', 'Buy a Laptop');
-- Force-fix Vietnamese text and emoji using UTF-8 hex literals.
-- This migration is resilient even if prior text became '?' due client encoding.
-- Safe to re-run on existing Personal_Finance database.

USE Personal_Finance;
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- 1) Canonical Vietnamese category names + icons for seeded categories (ID 1..8)
UPDATE ExpenseCategories
SET
    CategoryName = CASE CategoryID
        WHEN 1 THEN CONVERT(0xC4826E2075E1BB916E67 USING utf8mb4)            -- Ăn uống
        WHEN 2 THEN CONVERT(0x44692063687579E1BB836E USING utf8mb4)          -- Di chuyển
        WHEN 3 THEN CONVERT(0x4769C3A16F2064E1BBA563 USING utf8mb4)          -- Giáo dục
        WHEN 4 THEN CONVERT(0x4769E1BAA369207472C3AD USING utf8mb4)          -- Giải trí
        WHEN 5 THEN CONVERT(0x4D75612073E1BAAF6D USING utf8mb4)              -- Mua sắm
        WHEN 6 THEN CONVERT(0x53E1BBA963206B68E1BB8F65 USING utf8mb4)        -- Sức khỏe
        WHEN 7 THEN CONVERT(0x48C3B36120C491C6A16E USING utf8mb4)            -- Hóa đơn
        WHEN 8 THEN CONVERT(0x546875C3AA206E68C3A0 USING utf8mb4)            -- Thuê nhà
        ELSE CategoryName
    END,
    IconEmoji = CASE CategoryID
        WHEN 1 THEN CONVERT(0xF09F8DBDEFB88F USING utf8mb4)                  -- 🍽️
        WHEN 2 THEN CONVERT(0xF09FA7AD USING utf8mb4)                        -- 🚗
        WHEN 3 THEN CONVERT(0xF09F8E93 USING utf8mb4)                        -- 🎓
        WHEN 4 THEN CONVERT(0xF09F8EAC USING utf8mb4)                        -- 🎬
        WHEN 5 THEN CONVERT(0xF09F9B8DEFB88F USING utf8mb4)                  -- 🛍️
        WHEN 6 THEN CONVERT(0xF09F8FA5 USING utf8mb4)                        -- 🏥
        WHEN 7 THEN CONVERT(0xF09F92A1 USING utf8mb4)                        -- 💡
        WHEN 8 THEN CONVERT(0xF09F8FA0 USING utf8mb4)                        -- 🏠
        ELSE COALESCE(NULLIF(IconEmoji, ''), CONVERT(0xF09F92B8 USING utf8mb4)) -- 💸
    END
WHERE CategoryID BETWEEN 1 AND 8;

-- 2) Income descriptions (seed-like prefixes)
UPDATE Income
SET Description = REPLACE(Description, 'Monthly salary - ', CONVERT(0x4CC6B0C6A16E672068C3A06E67207468C3A16E67202D20 USING utf8mb4))
WHERE Description LIKE 'Monthly salary - %';

UPDATE Income
SET Description = REPLACE(Description, 'Main salary (variable) - ', CONVERT(0x4CC6B0C6A16E67206368C3AD6E6820286269E1BABF6E20C491E1BB996E6729202D20 USING utf8mb4))
WHERE Description LIKE 'Main salary (variable) - %';

UPDATE Income
SET Description = REPLACE(Description, 'Freelance design income - ', CONVERT(0x546875206E68E1BAAD7020746869E1BABF74206BE1BABF2074E1BBB120646F202D20 USING utf8mb4))
WHERE Description LIKE 'Freelance design income - %';

UPDATE Income
SET Description = REPLACE(Description, 'Tutoring income - ', CONVERT(0x546875206E68E1BAAD702064E1BAA179206BC3A86D202D20 USING utf8mb4))
WHERE Description LIKE 'Tutoring income - %';

UPDATE Income
SET Description = REPLACE(Description, 'Online business income - ', CONVERT(0x546875206E68E1BAAD70206B696E6820646F616E68206F6E6C696E65202D20 USING utf8mb4))
WHERE Description LIKE 'Online business income - %';

UPDATE Income
SET Description = REPLACE(Description, 'Quarterly scholarship - ', CONVERT(0x48E1BB8D632062E1BB956E67207468656F207175C3BD202D20 USING utf8mb4))
WHERE Description LIKE 'Quarterly scholarship - %';

UPDATE Income
SET Description = REPLACE(Description, 'Overtime income - ', CONVERT(0x546875206E68E1BAAD70206CC3A06D207468C3AA6D206769E1BB9D202D20 USING utf8mb4))
WHERE Description LIKE 'Overtime income - %';

-- 3) Expense descriptions (seed-like prefixes)
UPDATE Expenses
SET Description = REPLACE(Description, 'Monthly rent - ', CONVERT(0x5469E1BB816E20746875C3AA206E68C3A02068C3A06E67207468C3A16E67202D20 USING utf8mb4))
WHERE Description LIKE 'Monthly rent - %';

UPDATE Expenses
SET Description = REPLACE(Description, 'Food and groceries - ', CONVERT(0xC4826E2075E1BB916E672076C3A02074E1BAA1702068C3B361202D20 USING utf8mb4))
WHERE Description LIKE 'Food and groceries - %';

UPDATE Expenses
SET Description = REPLACE(Description, 'Transportation cost - ', CONVERT(0x436869207068C3AD2064692063687579E1BB836E202D20 USING utf8mb4))
WHERE Description LIKE 'Transportation cost - %';

UPDATE Expenses
SET Description = REPLACE(Description, 'Entertainment spending - ', CONVERT(0x436869207469C3AA75206769E1BAA369207472C3AD202D20 USING utf8mb4))
WHERE Description LIKE 'Entertainment spending - %';

UPDATE Expenses
SET Description = REPLACE(Description, 'Utilities bill - ', CONVERT(0x48C3B36120C491C6A16E207469E1BB876E20C3AD6368202D20 USING utf8mb4))
WHERE Description LIKE 'Utilities bill - %';

UPDATE Expenses
SET Description = REPLACE(Description, 'Healthcare spending - ', CONVERT(0x436869207469C3AA752073E1BBA963206B68E1BB8F65202D20 USING utf8mb4))
WHERE Description LIKE 'Healthcare spending - %';

UPDATE Expenses
SET Description = REPLACE(Description, 'Shopping spending - ', CONVERT(0x436869207469C3AA75206D75612073E1BAAF6D202D20 USING utf8mb4))
WHERE Description LIKE 'Shopping spending - %';

UPDATE Expenses
SET Description = REPLACE(Description, 'Personal shopping - ', CONVERT(0x4D75612073E1BAAF6D2063C3A1206E68C3A26E202D20 USING utf8mb4))
WHERE Description LIKE 'Personal shopping - %';

UPDATE Expenses
SET Description = REPLACE(Description, 'Healthcare cost (variable) - ', CONVERT(0x436869207068C3AD2073E1BBA963206B68E1BB8F6520286269E1BABF6E20C491E1BB996E6729202D20 USING utf8mb4))
WHERE Description LIKE 'Healthcare cost (variable) - %';

UPDATE Expenses
SET Description = REPLACE(Description, 'Education spending - ', CONVERT(0x436869207469C3AA75206769C3A16F2064E1BBA563202D20 USING utf8mb4))
WHERE Description LIKE 'Education spending - %';

-- 4) Translate seeded saving goal names + notes
UPDATE SavingGoals
SET GoalName = CONVERT(0x5175E1BBB9206B68E1BAA96E2063E1BAA570 USING utf8mb4)
WHERE GoalName = 'Emergency Fund';

UPDATE SavingGoals
SET GoalName = CONVERT(0x4D7561206C6170746F70 USING utf8mb4)
WHERE GoalName = 'Buy a Laptop';

UPDATE SavingGoals
SET GoalName = CONVERT(0x5469E1BABF74206B69E1BB876D2063C3A1206E68C3A26E USING utf8mb4)
WHERE GoalName = 'Personal Saving';

UPDATE SavingGoals
SET CustomGoalCategoryName = CONVERT(0x4BE1BABF20686FE1BAA16368207469E1BABF74206B69E1BB876D2063C3A1206E68C3A26E2074C3B979206368E1BB896E68 USING utf8mb4)
WHERE CustomGoalCategoryName = 'My custom saving plan';

UPDATE SavingGoals
SET Notes = REPLACE(Notes, 'Build a safety fund for unexpected expenses.', CONVERT(0x58C3A2792064E1BBB16E67207175E1BBB920616E20746FC3A06E2063686F20636869207068C3AD207068C3A1742073696E682E USING utf8mb4))
WHERE Notes LIKE '%Build a safety fund for unexpected expenses.%';

UPDATE SavingGoals
SET Notes = REPLACE(Notes, 'Personal technology upgrade goal.', CONVERT(0x4DE1BBA563207469C3AA75206EC3A26E672063E1BAA57020746869E1BABF742062E1BB8B2063C3B46E67206E6768E1BB872063C3A1206E68C3A26E2E USING utf8mb4))
WHERE Notes LIKE '%Personal technology upgrade goal.%';

UPDATE SavingGoals
SET Notes = REPLACE(Notes, 'Custom saving goal.', CONVERT(0x4DE1BBA563207469C3AA75207469E1BABF74206B69E1BB876D2074C3B979206368E1BB896E682E USING utf8mb4))
WHERE Notes LIKE '%Custom saving goal.%';

-- 5) Translate seeded goal contribution note
UPDATE GoalContributions
SET Description = REPLACE(Description, 'Initial goal contribution', CONVERT(0x4B686FE1BAA36E20C491C3B36E672067C3B370206DE1BBA563207469C3AA752062616E20C491E1BAA775 USING utf8mb4))
WHERE Description LIKE '%Initial goal contribution%';

-- 6) Translate seeded budget notes
UPDATE BudgetPlans
SET Notes = REPLACE(Notes, 'Soft locked to reduce unnecessary spending.', CONVERT(0x4B68C3B361206DE1BB816D20C491E1BB83206769E1BAA36D20636869207469C3AA75206B68C3B46E672063E1BAA76E20746869E1BABF742E USING utf8mb4))
WHERE Notes LIKE '%Soft locked to reduce unnecessary spending.%';

UPDATE BudgetPlans
SET Notes = REPLACE(Notes, 'Essential monthly spending.', CONVERT(0x436869207469C3AA7520746869E1BABF742079E1BABF752068E1BAB16E67207468C3A16E672E USING utf8mb4))
WHERE Notes LIKE '%Essential monthly spending.%';

-- 7) Translate common fixed-expense item labels inside JSON payload
UPDATE BudgetSettings
SET FixedExpenseItemsJson = CAST(
    REPLACE(
        REPLACE(
            CAST(FixedExpenseItemsJson AS CHAR CHARACTER SET utf8mb4),
            '"Phone and internet"',
            CONCAT('"', CONVERT(0xC49069E1BB876E2074686FE1BAA1692076C3A020696E7465726E6574 USING utf8mb4), '"')
        ),
        '"Rent"',
        CONCAT('"', CONVERT(0x546875C3AA206E68C3A0 USING utf8mb4), '"')
    ) AS JSON
)
WHERE FixedExpenseItemsJson IS NOT NULL;


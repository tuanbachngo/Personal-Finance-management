-- Add system categories used by goal-linked expense flows.
-- Safe for existing databases: inserts only when equivalent names do not exist.

SET NAMES utf8mb4;
SET collation_connection = 'utf8mb4_0900_ai_ci';

INSERT INTO ExpenseCategories (CategoryName, IconEmoji)
SELECT 'Tích lũy', '💰'
WHERE NOT EXISTS (
    SELECT 1
    FROM ExpenseCategories
    WHERE CategoryName COLLATE utf8mb4_0900_ai_ci IN ('Tích lũy', 'Tiết kiệm', 'Tich luy', 'Tiet kiem')
);

INSERT INTO ExpenseCategories (CategoryName, IconEmoji)
SELECT 'Trả nợ', '💳'
WHERE NOT EXISTS (
    SELECT 1
    FROM ExpenseCategories
    WHERE CategoryName COLLATE utf8mb4_0900_ai_ci IN ('Trả nợ', 'Nợ và trả góp', 'Tra no', 'No va tra gop')
);

UPDATE ExpenseCategories
SET IconEmoji = '💰'
WHERE CategoryName COLLATE utf8mb4_0900_ai_ci IN ('Tích lũy', 'Tiết kiệm', 'Tich luy', 'Tiet kiem');

UPDATE ExpenseCategories
SET IconEmoji = '💳'
WHERE CategoryName COLLATE utf8mb4_0900_ai_ci IN ('Trả nợ', 'Nợ và trả góp', 'Tra no', 'No va tra gop');

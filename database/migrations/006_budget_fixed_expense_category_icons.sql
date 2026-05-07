-- Add category icons and normalize fixed-expense item JSON support.
-- Safe to re-run on existing Personal_Finance database.

USE Personal_Finance;
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;

DROP PROCEDURE IF EXISTS migrate_budget_fixed_expense_category_icons;
DELIMITER //
CREATE PROCEDURE migrate_budget_fixed_expense_category_icons()
BEGIN
    DECLARE has_icon_emoji INT DEFAULT 0;

    SELECT COUNT(*)
    INTO has_icon_emoji
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'ExpenseCategories'
      AND COLUMN_NAME = 'IconEmoji';

    IF has_icon_emoji = 0 THEN
        ALTER TABLE ExpenseCategories
            ADD COLUMN IconEmoji VARCHAR(16) NOT NULL DEFAULT '💸' AFTER CategoryName;
    END IF;
END//
DELIMITER ;

CALL migrate_budget_fixed_expense_category_icons();
DROP PROCEDURE IF EXISTS migrate_budget_fixed_expense_category_icons;

UPDATE ExpenseCategories
SET IconEmoji =
    CASE
        WHEN LOWER(CategoryName) LIKE '%food%'
          OR CategoryName LIKE '%ăn%' THEN '🍽️'
        WHEN LOWER(CategoryName) LIKE '%shop%'
          OR CategoryName LIKE '%mua sắm%' THEN '🛍️'
        WHEN LOWER(CategoryName) LIKE '%rent%'
          OR CategoryName LIKE '%thuê%' THEN '🏠'
        WHEN LOWER(CategoryName) LIKE '%transport%'
          OR CategoryName LIKE '%di chuyển%' THEN '🚗'
        WHEN LOWER(CategoryName) LIKE '%entertain%'
          OR CategoryName LIKE '%giải trí%' THEN '🎬'
        WHEN LOWER(CategoryName) LIKE '%health%'
          OR CategoryName LIKE '%sức khỏe%'
          OR CategoryName LIKE '%y tế%' THEN '🏥'
        WHEN LOWER(CategoryName) LIKE '%education%'
          OR CategoryName LIKE '%giáo dục%' THEN '🎓'
        WHEN LOWER(CategoryName) LIKE '%utilit%'
          OR CategoryName LIKE '%hóa đơn%' THEN '💡'
        WHEN LOWER(CategoryName) LIKE '%other%'
          OR CategoryName LIKE '%khác%' THEN '💸'
        ELSE COALESCE(NULLIF(IconEmoji, ''), '💸')
    END;


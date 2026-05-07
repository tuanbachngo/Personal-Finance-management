-- Fix legacy mojibake icon data and translate seed-like text data to Vietnamese.
-- Safe to re-run on existing Personal_Finance database.

USE Personal_Finance;
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- 1) Normalize expense category names to Vietnamese
UPDATE ExpenseCategories
SET CategoryName = CASE
    WHEN CategoryID = 1 OR LOWER(CategoryName) IN ('food', 'ăn uống', 'an uong') THEN 'Ăn uống'
    WHEN CategoryID = 2 OR LOWER(CategoryName) IN ('transportation', 'di chuyển', 'di chuyen') THEN 'Di chuyển'
    WHEN CategoryID = 3 OR LOWER(CategoryName) IN ('education', 'giáo dục', 'giao duc') THEN 'Giáo dục'
    WHEN CategoryID = 4 OR LOWER(CategoryName) IN ('entertainment', 'giải trí', 'giai tri') THEN 'Giải trí'
    WHEN CategoryID = 5 OR LOWER(CategoryName) IN ('shopping', 'mua sắm', 'mua sam') THEN 'Mua sắm'
    WHEN CategoryID = 6 OR LOWER(CategoryName) IN ('healthcare', 'sức khỏe', 'suc khoe', 'y tế', 'y te') THEN 'Sức khỏe'
    WHEN CategoryID = 7 OR LOWER(CategoryName) IN ('utilities', 'hóa đơn', 'hoa don') THEN 'Hóa đơn'
    WHEN CategoryID = 8 OR LOWER(CategoryName) IN ('rent', 'thuê nhà', 'thue nha') THEN 'Thuê nhà'
    ELSE CategoryName
END;

-- 2) Force category icon values with proper UTF-8 emoji
UPDATE ExpenseCategories
SET IconEmoji = CASE
    WHEN CategoryID = 1 OR CategoryName = 'Ăn uống' THEN '🍽️'
    WHEN CategoryID = 2 OR CategoryName = 'Di chuyển' THEN '🚗'
    WHEN CategoryID = 3 OR CategoryName = 'Giáo dục' THEN '🎓'
    WHEN CategoryID = 4 OR CategoryName = 'Giải trí' THEN '🎬'
    WHEN CategoryID = 5 OR CategoryName = 'Mua sắm' THEN '🛍️'
    WHEN CategoryID = 6 OR CategoryName = 'Sức khỏe' THEN '🏥'
    WHEN CategoryID = 7 OR CategoryName = 'Hóa đơn' THEN '💡'
    WHEN CategoryID = 8 OR CategoryName = 'Thuê nhà' THEN '🏠'
    ELSE COALESCE(NULLIF(IconEmoji, ''), '💸')
END;

-- 3) Translate seed-like income descriptions
UPDATE Income
SET Description = REPLACE(Description, 'Monthly salary - ', 'Lương hàng tháng - ')
WHERE Description LIKE 'Monthly salary - %';

UPDATE Income
SET Description = REPLACE(Description, 'Main salary (variable) - ', 'Lương chính (biến động) - ')
WHERE Description LIKE 'Main salary (variable) - %';

UPDATE Income
SET Description = REPLACE(Description, 'Freelance design income - ', 'Thu nhập thiết kế tự do - ')
WHERE Description LIKE 'Freelance design income - %';

UPDATE Income
SET Description = REPLACE(Description, 'Tutoring income - ', 'Thu nhập dạy kèm - ')
WHERE Description LIKE 'Tutoring income - %';

UPDATE Income
SET Description = REPLACE(Description, 'Online business income - ', 'Thu nhập kinh doanh online - ')
WHERE Description LIKE 'Online business income - %';

UPDATE Income
SET Description = REPLACE(Description, 'Quarterly scholarship - ', 'Học bổng theo quý - ')
WHERE Description LIKE 'Quarterly scholarship - %';

UPDATE Income
SET Description = REPLACE(Description, 'Overtime income - ', 'Thu nhập làm thêm giờ - ')
WHERE Description LIKE 'Overtime income - %';

-- 4) Translate seed-like expense descriptions
UPDATE Expenses
SET Description = REPLACE(Description, 'Monthly rent - ', 'Tiền thuê nhà hàng tháng - ')
WHERE Description LIKE 'Monthly rent - %';

UPDATE Expenses
SET Description = REPLACE(Description, 'Food and groceries - ', 'Ăn uống và tạp hóa - ')
WHERE Description LIKE 'Food and groceries - %';

UPDATE Expenses
SET Description = REPLACE(Description, 'Transportation cost - ', 'Chi phí di chuyển - ')
WHERE Description LIKE 'Transportation cost - %';

UPDATE Expenses
SET Description = REPLACE(Description, 'Entertainment spending - ', 'Chi tiêu giải trí - ')
WHERE Description LIKE 'Entertainment spending - %';

UPDATE Expenses
SET Description = REPLACE(Description, 'Utilities bill - ', 'Hóa đơn tiện ích - ')
WHERE Description LIKE 'Utilities bill - %';

UPDATE Expenses
SET Description = REPLACE(Description, 'Healthcare spending - ', 'Chi tiêu sức khỏe - ')
WHERE Description LIKE 'Healthcare spending - %';

UPDATE Expenses
SET Description = REPLACE(Description, 'Shopping spending - ', 'Chi tiêu mua sắm - ')
WHERE Description LIKE 'Shopping spending - %';

UPDATE Expenses
SET Description = REPLACE(Description, 'Personal shopping - ', 'Mua sắm cá nhân - ')
WHERE Description LIKE 'Personal shopping - %';

UPDATE Expenses
SET Description = REPLACE(Description, 'Healthcare cost (variable) - ', 'Chi phí sức khỏe (biến động) - ')
WHERE Description LIKE 'Healthcare cost (variable) - %';

UPDATE Expenses
SET Description = REPLACE(Description, 'Education spending - ', 'Chi tiêu giáo dục - ')
WHERE Description LIKE 'Education spending - %';

-- 5) Translate saving goal categories seeded by CategoryKey
UPDATE SavingGoalCategories
SET
    CategoryName = CASE CategoryKey
        WHEN 'EMERGENCY_FUND' THEN 'Quỹ khẩn cấp'
        WHEN 'VACATION' THEN 'Du lịch / Nghỉ dưỡng'
        WHEN 'LAPTOP' THEN 'Laptop / Máy tính'
        WHEN 'HOME_DOWN_PAYMENT' THEN 'Trả trước mua nhà'
        WHEN 'CAR' THEN 'Ô tô / Phương tiện'
        WHEN 'EDUCATION' THEN 'Giáo dục'
        WHEN 'WEDDING' THEN 'Đám cưới'
        WHEN 'HEALTH' THEN 'Sức khỏe / Y tế'
        WHEN 'BUSINESS' THEN 'Kinh doanh'
        WHEN 'INVESTMENT' THEN 'Đầu tư'
        WHEN 'GIFT' THEN 'Quà tặng'
        WHEN 'OTHER' THEN 'Khác / Tùy chỉnh'
        ELSE CategoryName
    END,
    Description = CASE CategoryKey
        WHEN 'EMERGENCY_FUND' THEN 'Quỹ an toàn cho các chi phí phát sinh.'
        WHEN 'VACATION' THEN 'Tiết kiệm cho các chuyến du lịch và nghỉ dưỡng.'
        WHEN 'LAPTOP' THEN 'Tiết kiệm để mua laptop, máy tính hoặc thiết bị làm việc.'
        WHEN 'HOME_DOWN_PAYMENT' THEN 'Tiết kiệm tiền trả trước khi mua nhà hoặc căn hộ.'
        WHEN 'CAR' THEN 'Tiết kiệm để mua ô tô, xe máy hoặc phương tiện khác.'
        WHEN 'EDUCATION' THEN 'Tiết kiệm cho học phí, khóa học hoặc chi phí học tập.'
        WHEN 'WEDDING' THEN 'Tiết kiệm cho kế hoạch cưới hỏi.'
        WHEN 'HEALTH' THEN 'Tiết kiệm cho chăm sóc sức khỏe và chi phí y tế.'
        WHEN 'BUSINESS' THEN 'Tiết kiệm cho kế hoạch kinh doanh hoặc khởi nghiệp.'
        WHEN 'INVESTMENT' THEN 'Tiết kiệm dành cho mục tiêu đầu tư.'
        WHEN 'GIFT' THEN 'Tiết kiệm cho quà tặng và dịp đặc biệt.'
        WHEN 'OTHER' THEN 'Danh mục mục tiêu tiết kiệm tùy chỉnh.'
        ELSE Description
    END;

-- 6) Translate seeded saving goals and notes
UPDATE SavingGoals
SET GoalName = 'Quỹ khẩn cấp'
WHERE GoalName = 'Emergency Fund';

UPDATE SavingGoals
SET GoalName = 'Mua laptop'
WHERE GoalName = 'Buy a Laptop';

UPDATE SavingGoals
SET GoalName = 'Tiết kiệm cá nhân'
WHERE GoalName = 'Personal Saving';

UPDATE SavingGoals
SET CustomGoalCategoryName = 'Kế hoạch tiết kiệm cá nhân tùy chỉnh'
WHERE CustomGoalCategoryName = 'My custom saving plan';

UPDATE SavingGoals
SET Notes = REPLACE(Notes, 'Build a safety fund for unexpected expenses.', 'Xây dựng quỹ an toàn cho chi phí phát sinh.')
WHERE Notes LIKE '%Build a safety fund for unexpected expenses.%';

UPDATE SavingGoals
SET Notes = REPLACE(Notes, 'Personal technology upgrade goal.', 'Mục tiêu nâng cấp thiết bị công nghệ cá nhân.')
WHERE Notes LIKE '%Personal technology upgrade goal.%';

UPDATE SavingGoals
SET Notes = REPLACE(Notes, 'Custom saving goal.', 'Mục tiêu tiết kiệm tùy chỉnh.')
WHERE Notes LIKE '%Custom saving goal.%';

-- 7) Translate seeded goal contribution note
UPDATE GoalContributions
SET Description = REPLACE(Description, 'Initial goal contribution', 'Khoản đóng góp mục tiêu ban đầu')
WHERE Description LIKE '%Initial goal contribution%';

-- 8) Translate seeded budget notes
UPDATE BudgetPlans
SET Notes = REPLACE(Notes, 'Soft locked to reduce unnecessary spending.', 'Khóa mềm để giảm chi tiêu không cần thiết.')
WHERE Notes LIKE '%Soft locked to reduce unnecessary spending.%';

UPDATE BudgetPlans
SET Notes = REPLACE(Notes, 'Essential monthly spending.', 'Chi tiêu thiết yếu hằng tháng.')
WHERE Notes LIKE '%Essential monthly spending.%';

-- 9) Translate common fixed-expense item labels inside JSON payload
UPDATE BudgetSettings
SET FixedExpenseItemsJson = CAST(
    REPLACE(
        REPLACE(
            CAST(FixedExpenseItemsJson AS CHAR CHARACTER SET utf8mb4),
            '"Phone and internet"',
            '"Điện thoại và internet"'
        ),
        '"Rent"',
        '"Thuê nhà"'
    ) AS JSON
)
WHERE FixedExpenseItemsJson IS NOT NULL;

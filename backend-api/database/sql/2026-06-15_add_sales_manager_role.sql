INSERT INTO roles (`name`, `code`, `description`, `created_at`, `updated_at`)
SELECT 'Sales Manager', 'sales_manager', 'Can approve quotations with normal user access otherwise.', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1
    FROM roles
    WHERE LOWER(`code`) = 'sales_manager'
       OR LOWER(`name`) = 'sales manager'
);

ALTER TABLE customers
ADD COLUMN customer_importance VARCHAR(10) NULL AFTER rating,
ADD COLUMN customer_category VARCHAR(50) NULL AFTER customer_importance;

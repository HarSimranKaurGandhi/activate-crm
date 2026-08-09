ALTER TABLE leads
ADD COLUMN customer_importance VARCHAR(10) NULL AFTER tags,
ADD COLUMN customer_category VARCHAR(50) NULL AFTER customer_importance;

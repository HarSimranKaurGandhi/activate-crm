ALTER TABLE quotations
ADD COLUMN show_mrp_to_customer TINYINT(1) NOT NULL DEFAULT 1
AFTER show_discount_to_customer;

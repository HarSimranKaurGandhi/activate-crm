ALTER TABLE quotations
ADD COLUMN show_item_wise_gst_to_customer TINYINT(1) NOT NULL DEFAULT 0
AFTER show_mrp_to_customer;

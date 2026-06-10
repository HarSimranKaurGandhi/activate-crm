ALTER TABLE quotations
ADD COLUMN round_off_net_amount_to_customer TINYINT(1) NOT NULL DEFAULT 0
AFTER show_item_wise_gst_to_customer;

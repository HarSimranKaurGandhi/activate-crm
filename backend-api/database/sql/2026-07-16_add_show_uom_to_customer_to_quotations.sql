ALTER TABLE `quotations`
ADD COLUMN `show_uom_to_customer` TINYINT(1) NOT NULL DEFAULT 0
AFTER `round_off_net_amount_to_customer`;

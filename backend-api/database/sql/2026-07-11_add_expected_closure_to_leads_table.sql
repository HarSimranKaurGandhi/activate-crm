ALTER TABLE `leads`
    ADD COLUMN `expected_closure` VARCHAR(20) NULL AFTER `expected_order_value`;

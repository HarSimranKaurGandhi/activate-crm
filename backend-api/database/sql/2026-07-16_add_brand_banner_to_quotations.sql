ALTER TABLE `quotations`
ADD COLUMN `show_brand_banner_to_customer` TINYINT(1) NOT NULL DEFAULT 0 AFTER `show_uom_to_customer`,
ADD COLUMN `brand_banner_id` BIGINT UNSIGNED NULL AFTER `show_brand_banner_to_customer`,
ADD CONSTRAINT `quotations_brand_banner_id_foreign`
    FOREIGN KEY (`brand_banner_id`) REFERENCES `brands`(`id`)
    ON DELETE SET NULL;

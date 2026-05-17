CREATE TABLE IF NOT EXISTS `quotation_item_discount_overrides` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `quotation_item_id` BIGINT UNSIGNED NOT NULL,
  `discount_percent` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `discount_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  `reason` TEXT NULL,
  `created_by` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `quotation_item_discount_overrides_quotation_item_id_index` (`quotation_item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

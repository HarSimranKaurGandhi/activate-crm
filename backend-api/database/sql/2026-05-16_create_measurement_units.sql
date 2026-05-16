CREATE TABLE IF NOT EXISTS `measurement_units` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `display_order` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_measurement_units_code` (`code`)
);

INSERT INTO `measurement_units` (`code`, `name`, `display_order`, `is_active`)
VALUES
  ('NOS', 'NOS', 1, 1),
  ('SQFT', 'SQFT', 2, 1),
  ('SET', 'SET', 3, 1),
  ('KG', 'KG', 4, 1)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `display_order` = VALUES(`display_order`),
  `is_active` = VALUES(`is_active`);

CREATE TABLE `leads` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `lead_source` VARCHAR(50) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(30) NOT NULL,
    `email` VARCHAR(255) NULL,
    `address_line_1` VARCHAR(255) NULL,
    `address_line_2` VARCHAR(255) NULL,
    `city` VARCHAR(100) NULL,
    `state` VARCHAR(100) NULL,
    `pincode` VARCHAR(20) NULL,
    `country` VARCHAR(100) NULL,
    `requirement` LONGTEXT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'new',
    `tags` JSON NULL,
    `follow_up_date` DATE NULL,
    `assigned_to` BIGINT UNSIGNED NULL,
    `created_by` BIGINT UNSIGNED NULL,
    `created_at` TIMESTAMP NULL,
    `updated_at` TIMESTAMP NULL,
    CONSTRAINT `leads_assigned_to_foreign`
        FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`)
        ON DELETE SET NULL,
    CONSTRAINT `leads_created_by_foreign`
        FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
        ON DELETE SET NULL
);

CREATE INDEX `leads_lead_source_status_index` ON `leads` (`lead_source`, `status`);
CREATE INDEX `leads_follow_up_date_index` ON `leads` (`follow_up_date`);

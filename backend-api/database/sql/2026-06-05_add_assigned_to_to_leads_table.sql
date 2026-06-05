ALTER TABLE `leads`
    ADD COLUMN `assigned_to` BIGINT UNSIGNED NULL AFTER `follow_up_date`,
    ADD CONSTRAINT `leads_assigned_to_foreign`
        FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`)
        ON DELETE SET NULL;

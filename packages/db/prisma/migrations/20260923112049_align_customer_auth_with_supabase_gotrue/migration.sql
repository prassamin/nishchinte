-- AlterTable
ALTER TABLE `customer_identities` ADD COLUMN `email` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `customers` ADD COLUMN `aud` VARCHAR(191) NOT NULL DEFAULT 'authenticated',
    ADD COLUMN `confirmed_at` DATETIME(3) NULL,
    ADD COLUMN `email_confirmed_at` DATETIME(3) NULL,
    ADD COLUMN `is_anonymous` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `phone_confirmed_at` DATETIME(3) NULL,
    ADD COLUMN `role` VARCHAR(191) NOT NULL DEFAULT 'authenticated';

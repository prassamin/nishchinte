-- AlterTable
ALTER TABLE `customer_identities` ADD COLUMN `is_verified` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `verified_at` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `customer_identities_provider_is_verified_idx` ON `customer_identities`(`provider`, `is_verified`);

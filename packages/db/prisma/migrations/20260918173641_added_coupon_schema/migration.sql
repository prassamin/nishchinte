-- CreateTable
CREATE TABLE `coupons` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `type` ENUM('PERCENTAGE', 'FLAT') NOT NULL DEFAULT 'PERCENTAGE',
    `discount_value` DECIMAL(10, 2) NOT NULL,
    `min_purchase` DECIMAL(10, 2) NULL,
    `max_discount_amount` DECIMAL(10, 2) NULL,
    `max_uses` INTEGER NULL,
    `max_uses_per_user` INTEGER NULL DEFAULT 1,
    `current_uses` INTEGER NOT NULL DEFAULT 0,
    `target` ENUM('ALL', 'SPECIFIC_PRODUCTS', 'SPECIFIC_CATEGORIES') NOT NULL DEFAULT 'ALL',
    `product_ids` JSON NULL,
    `category_ids` JSON NULL,
    `is_limited_time` BOOLEAN NOT NULL DEFAULT false,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `coupons_code_key`(`code`),
    INDEX `coupons_code_idx`(`code`),
    INDEX `coupons_is_active_idx`(`is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

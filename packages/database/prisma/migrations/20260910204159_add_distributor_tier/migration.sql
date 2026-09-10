-- AlterTable
ALTER TABLE `Partner` ADD COLUMN `distributorId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `PartnerWalletTransaction` ADD COLUMN `createdByDistributorId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `Distributor` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `suspendedAt` DATETIME(3) NULL,
    `walletBalanceCents` INTEGER NOT NULL DEFAULT 0,
    `creditEnabled` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Distributor_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DistributorSession` (
    `id` VARCHAR(191) NOT NULL,
    `distributorId` VARCHAR(191) NOT NULL,
    `sessionToken` VARCHAR(191) NOT NULL,
    `userAgent` VARCHAR(191) NULL,
    `ipAddress` VARCHAR(191) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `DistributorSession_sessionToken_key`(`sessionToken`),
    INDEX `DistributorSession_distributorId_idx`(`distributorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DistributorWalletTransaction` (
    `id` VARCHAR(191) NOT NULL,
    `distributorId` VARCHAR(191) NOT NULL,
    `type` ENUM('CREDIT', 'DEBIT') NOT NULL,
    `amountCents` INTEGER NOT NULL,
    `balanceAfterCents` INTEGER NOT NULL,
    `note` VARCHAR(191) NULL,
    `createdByAdminId` VARCHAR(191) NULL,
    `partnerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DistributorWalletTransaction_distributorId_createdAt_idx`(`distributorId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DistributorPlanPrice` (
    `id` VARCHAR(191) NOT NULL,
    `distributorId` VARCHAR(191) NOT NULL,
    `planId` VARCHAR(191) NOT NULL,
    `priceMonthlyCents` INTEGER NULL,
    `priceYearlyCents` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DistributorPlanPrice_distributorId_planId_key`(`distributorId`, `planId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Partner_distributorId_idx` ON `Partner`(`distributorId`);

-- AddForeignKey
ALTER TABLE `Partner` ADD CONSTRAINT `Partner_distributorId_fkey` FOREIGN KEY (`distributorId`) REFERENCES `Distributor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartnerWalletTransaction` ADD CONSTRAINT `PartnerWalletTransaction_createdByDistributorId_fkey` FOREIGN KEY (`createdByDistributorId`) REFERENCES `Distributor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DistributorSession` ADD CONSTRAINT `DistributorSession_distributorId_fkey` FOREIGN KEY (`distributorId`) REFERENCES `Distributor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DistributorWalletTransaction` ADD CONSTRAINT `DistributorWalletTransaction_distributorId_fkey` FOREIGN KEY (`distributorId`) REFERENCES `Distributor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DistributorWalletTransaction` ADD CONSTRAINT `DistributorWalletTransaction_createdByAdminId_fkey` FOREIGN KEY (`createdByAdminId`) REFERENCES `AdminUser`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DistributorWalletTransaction` ADD CONSTRAINT `DistributorWalletTransaction_partnerId_fkey` FOREIGN KEY (`partnerId`) REFERENCES `Partner`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DistributorPlanPrice` ADD CONSTRAINT `DistributorPlanPrice_distributorId_fkey` FOREIGN KEY (`distributorId`) REFERENCES `Distributor`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DistributorPlanPrice` ADD CONSTRAINT `DistributorPlanPrice_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `Plan`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

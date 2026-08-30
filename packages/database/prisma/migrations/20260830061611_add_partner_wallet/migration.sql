-- AlterTable
ALTER TABLE `Partner` ADD COLUMN `walletBalanceCents` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `PartnerWalletTransaction` (
    `id` VARCHAR(191) NOT NULL,
    `partnerId` VARCHAR(191) NOT NULL,
    `type` ENUM('CREDIT', 'DEBIT') NOT NULL,
    `amountCents` INTEGER NOT NULL,
    `balanceAfterCents` INTEGER NOT NULL,
    `note` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NULL,
    `organizationId` VARCHAR(191) NULL,
    `planId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PartnerWalletTransaction_partnerId_createdAt_idx`(`partnerId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PartnerWalletTransaction` ADD CONSTRAINT `PartnerWalletTransaction_partnerId_fkey` FOREIGN KEY (`partnerId`) REFERENCES `Partner`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartnerWalletTransaction` ADD CONSTRAINT `PartnerWalletTransaction_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `AdminUser`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartnerWalletTransaction` ADD CONSTRAINT `PartnerWalletTransaction_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartnerWalletTransaction` ADD CONSTRAINT `PartnerWalletTransaction_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `Plan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;


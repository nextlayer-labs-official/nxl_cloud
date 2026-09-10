-- AlterTable
ALTER TABLE `DistributorWalletTransaction` ADD COLUMN `organizationId` VARCHAR(191) NULL,
    ADD COLUMN `planId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `DistributorWalletTransaction` ADD CONSTRAINT `DistributorWalletTransaction_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DistributorWalletTransaction` ADD CONSTRAINT `DistributorWalletTransaction_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `Plan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

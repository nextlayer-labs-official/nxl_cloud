-- AlterTable
ALTER TABLE `Subscription` ADD COLUMN `pendingBillingCycle` ENUM('MONTHLY', 'ANNUAL') NULL,
    ADD COLUMN `pendingPlanId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Subscription` ADD CONSTRAINT `Subscription_pendingPlanId_fkey` FOREIGN KEY (`pendingPlanId`) REFERENCES `Plan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

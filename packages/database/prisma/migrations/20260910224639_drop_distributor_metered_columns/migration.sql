-- Reverts 20260910221605_distributor_metered_debit: the distributor's wallet
-- is no longer charged on a partner's plan activation, so these columns are
-- unused. They were never populated in production.

-- DropForeignKey
ALTER TABLE `DistributorWalletTransaction` DROP FOREIGN KEY `DistributorWalletTransaction_organizationId_fkey`;

-- DropForeignKey
ALTER TABLE `DistributorWalletTransaction` DROP FOREIGN KEY `DistributorWalletTransaction_planId_fkey`;

-- DropIndex
DROP INDEX `DistributorWalletTransaction_organizationId_fkey` ON `DistributorWalletTransaction`;

-- DropIndex
DROP INDEX `DistributorWalletTransaction_planId_fkey` ON `DistributorWalletTransaction`;

-- AlterTable
ALTER TABLE `DistributorWalletTransaction` DROP COLUMN `organizationId`,
    DROP COLUMN `planId`;

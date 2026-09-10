-- Distributors no longer fund partner wallets directly, so the column that
-- marked a distributor-funded partner-wallet top-up is unused.

-- DropForeignKey
ALTER TABLE `PartnerWalletTransaction` DROP FOREIGN KEY `PartnerWalletTransaction_createdByDistributorId_fkey`;

-- DropIndex
DROP INDEX `PartnerWalletTransaction_createdByDistributorId_fkey` ON `PartnerWalletTransaction`;

-- AlterTable
ALTER TABLE `PartnerWalletTransaction` DROP COLUMN `createdByDistributorId`;

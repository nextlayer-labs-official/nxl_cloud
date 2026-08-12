/*
  Warnings:

  - You are about to drop the column `pendingBillingCycle` on the `subscription` table. All the data in the column will be lost.
  - You are about to drop the column `pendingPlanId` on the `subscription` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `subscription` DROP FOREIGN KEY `Subscription_pendingPlanId_fkey`;

-- DropIndex
DROP INDEX `Subscription_pendingPlanId_fkey` ON `subscription`;

-- AlterTable
ALTER TABLE `subscription` DROP COLUMN `pendingBillingCycle`,
    DROP COLUMN `pendingPlanId`,
    ADD COLUMN `creditBalanceCents` INTEGER NOT NULL DEFAULT 0;

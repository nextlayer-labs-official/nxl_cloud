/*
  Warnings:

  - You are about to drop the column `pendingBillingCycle` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `pendingPlanId` on the `Subscription` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `Subscription` DROP FOREIGN KEY `Subscription_pendingPlanId_fkey`;

-- DropIndex
DROP INDEX `Subscription_pendingPlanId_fkey` ON `Subscription`;

-- AlterTable
ALTER TABLE `Subscription` DROP COLUMN `pendingBillingCycle`,
    DROP COLUMN `pendingPlanId`,
    ADD COLUMN `creditBalanceCents` INTEGER NOT NULL DEFAULT 0;

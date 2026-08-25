/*
  Warnings:

  - You are about to drop the column `stripeCustomerId` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `stripeSubscriptionId` on the `Subscription` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Subscription` DROP COLUMN `stripeCustomerId`,
    DROP COLUMN `stripeSubscriptionId`,
    ADD COLUMN `razorpayOrderId` VARCHAR(191) NULL,
    ADD COLUMN `razorpayPaymentId` VARCHAR(191) NULL;

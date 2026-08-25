-- AlterTable
ALTER TABLE `Subscription` ADD COLUMN `discountPercent` INTEGER NULL,
    ADD COLUMN `freeUntil` DATETIME(3) NULL;

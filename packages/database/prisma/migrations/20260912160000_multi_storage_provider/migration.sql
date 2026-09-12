-- AlterTable
ALTER TABLE `File` ADD COLUMN `storageProvider` VARCHAR(191) NOT NULL DEFAULT 'wasabi';

-- AlterTable
ALTER TABLE `FileVersion` ADD COLUMN `storageProvider` VARCHAR(191) NOT NULL DEFAULT 'wasabi';

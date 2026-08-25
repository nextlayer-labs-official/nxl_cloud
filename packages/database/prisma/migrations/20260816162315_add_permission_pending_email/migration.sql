-- AlterTable
ALTER TABLE `Permission` ADD COLUMN `pendingEmail` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Permission_pendingEmail_idx` ON `Permission`(`pendingEmail`);

-- CreateIndex
CREATE UNIQUE INDEX `Permission_resourceType_resourceId_pendingEmail_key` ON `Permission`(`resourceType`, `resourceId`, `pendingEmail`);


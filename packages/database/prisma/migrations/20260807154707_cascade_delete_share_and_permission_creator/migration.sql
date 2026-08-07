-- DropForeignKey
ALTER TABLE `permission` DROP FOREIGN KEY `Permission_createdById_fkey`;

-- DropForeignKey
ALTER TABLE `sharelink` DROP FOREIGN KEY `ShareLink_createdById_fkey`;

-- DropIndex
DROP INDEX `Permission_createdById_fkey` ON `permission`;

-- DropIndex
DROP INDEX `ShareLink_createdById_fkey` ON `sharelink`;

-- AddForeignKey
ALTER TABLE `Permission` ADD CONSTRAINT `Permission_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShareLink` ADD CONSTRAINT `ShareLink_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

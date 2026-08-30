-- CreateTable
CREATE TABLE `PartnerChangeRequest` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `currentPartnerId` VARCHAR(191) NOT NULL,
    `newPartnerId` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `resolvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PartnerChangeRequest_organizationId_key`(`organizationId`),
    INDEX `PartnerChangeRequest_currentPartnerId_status_idx`(`currentPartnerId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PartnerChangeRequest` ADD CONSTRAINT `PartnerChangeRequest_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartnerChangeRequest` ADD CONSTRAINT `PartnerChangeRequest_currentPartnerId_fkey` FOREIGN KEY (`currentPartnerId`) REFERENCES `Partner`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartnerChangeRequest` ADD CONSTRAINT `PartnerChangeRequest_newPartnerId_fkey` FOREIGN KEY (`newPartnerId`) REFERENCES `Partner`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


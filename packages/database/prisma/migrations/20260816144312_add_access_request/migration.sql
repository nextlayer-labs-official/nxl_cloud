-- CreateTable
CREATE TABLE `AccessRequest` (
    `id` VARCHAR(191) NOT NULL,
    `resourceType` ENUM('FILE', 'FOLDER') NOT NULL,
    `resourceId` VARCHAR(191) NOT NULL,
    `requestedById` VARCHAR(191) NOT NULL,
    `message` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'GRANTED', 'DENIED') NOT NULL DEFAULT 'PENDING',
    `resolvedById` VARCHAR(191) NULL,
    `resolvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AccessRequest_resourceType_resourceId_idx`(`resourceType`, `resourceId`),
    UNIQUE INDEX `AccessRequest_resourceType_resourceId_requestedById_key`(`resourceType`, `resourceId`, `requestedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AccessRequest` ADD CONSTRAINT `AccessRequest_requestedById_fkey` FOREIGN KEY (`requestedById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AccessRequest` ADD CONSTRAINT `AccessRequest_resolvedById_fkey` FOREIGN KEY (`resolvedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;


-- CreateIndex
CREATE UNIQUE INDEX `Permission_resourceType_resourceId_granteeType_granteeId_key` ON `Permission`(`resourceType`, `resourceId`, `granteeType`, `granteeId`);

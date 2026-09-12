-- Allow platform-level admin actions (e.g. a settings change) with no single
-- associated organization to be logged in the same AuditLog table.
ALTER TABLE `AuditLog` DROP FOREIGN KEY `AuditLog_organizationId_fkey`;
ALTER TABLE `AuditLog` MODIFY `organizationId` VARCHAR(191) NULL;
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_organizationId_fkey`
  FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

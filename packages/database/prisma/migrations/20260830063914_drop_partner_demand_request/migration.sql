-- DropForeignKey
ALTER TABLE `PartnerDemandRequest` DROP FOREIGN KEY `PartnerDemandRequest_organizationId_fkey`;

-- DropForeignKey
ALTER TABLE `PartnerDemandRequest` DROP FOREIGN KEY `PartnerDemandRequest_partnerId_fkey`;

-- DropForeignKey
ALTER TABLE `PartnerDemandRequest` DROP FOREIGN KEY `PartnerDemandRequest_planId_fkey`;

-- DropForeignKey
ALTER TABLE `PartnerDemandRequest` DROP FOREIGN KEY `PartnerDemandRequest_resolvedById_fkey`;

-- DropTable
DROP TABLE `PartnerDemandRequest`;


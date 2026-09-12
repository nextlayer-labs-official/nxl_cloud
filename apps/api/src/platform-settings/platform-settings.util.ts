import { prisma } from "@nextlayer/database";

/**
 * Plain functions over a single singleton row (id "singleton"), same
 * "not a NestJS-DI service" convention as permission.util.ts — shared
 * directly by AdminService (reads/writes it) and BillingService (only
 * reads it, to gate checkout) without any new module wiring.
 */

const SINGLETON_ID = "singleton";

export async function getPlatformSettings() {
  return prisma.platformSettings.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID },
    update: {},
    include: { updatedBy: { select: { name: true } } },
  });
}

export async function setPaymentsEnabled(enabled: boolean, adminId: string) {
  return prisma.platformSettings.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, paymentsEnabled: enabled, updatedById: adminId },
    update: { paymentsEnabled: enabled, updatedById: adminId },
    include: { updatedBy: { select: { name: true } } },
  });
}

export async function setDefaultStorageProvider(providerId: string, adminId: string) {
  return prisma.platformSettings.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, defaultStorageProvider: providerId, updatedById: adminId },
    update: { defaultStorageProvider: providerId, updatedById: adminId },
    include: { updatedBy: { select: { name: true } } },
  });
}

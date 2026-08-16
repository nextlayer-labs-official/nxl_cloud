import { prisma, type Prisma } from "@nextlayer/database";

type AuditTargetType = "FILE" | "FOLDER";

/** Fire-and-await write to the shared AuditLog table, used to power both the admin-wide log and the per-item Activity tab in the portal's info panel. */
export async function recordAuditLog(
  organizationId: string,
  actorId: string,
  action: string,
  targetType: AuditTargetType,
  targetId: string,
  metadata?: Record<string, unknown>,
) {
  await prisma.auditLog.create({
    data: {
      organizationId,
      actorId,
      action,
      targetType,
      targetId,
      metadata: metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

import { prisma, type Prisma } from "@nextlayer/database";

type AuditTargetType = "FILE" | "FOLDER" | "ORGANIZATION" | "USER" | "SETTINGS";

interface RecordAuditLogParams {
  /** Omit for a platform-level action with no single associated org (e.g. a settings change). */
  organizationId?: string;
  /** Omit for an admin-originated action — AuditLog.actorId is an FK to the customer-portal User model, not AdminUser, so admin identity goes in `metadata` instead. */
  actorId?: string;
  action: string;
  targetType?: AuditTargetType;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

/** Fire-and-await write to the shared AuditLog table, used to power the admin-wide log, the per-item Activity tab in the portal's info panel, and the admin Overview's Recent Activity feed. */
export async function recordAuditLog(params: RecordAuditLogParams) {
  await prisma.auditLog.create({
    data: {
      organizationId: params.organizationId,
      actorId: params.actorId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

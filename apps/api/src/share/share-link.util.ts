import { randomBytes } from "node:crypto";
import { prisma } from "@nextlayer/database";

type ShareableType = "FILE" | "FOLDER";

/** Reuses an existing, still-valid share link instead of minting a new token every time "Share" is clicked. */
export async function getOrCreateShareLink(
  resourceType: ShareableType,
  resourceId: string,
  userId: string,
) {
  const existing = await prisma.shareLink.findFirst({
    where: {
      resourceType,
      resourceId,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });

  const token = existing?.token ?? randomBytes(24).toString("hex");
  if (!existing) {
    await prisma.shareLink.create({
      data: { resourceType, resourceId, token, createdById: userId },
    });
  }

  const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";
  return { token, url: `${webOrigin}/share/${token}` };
}

/** Read-only counterpart to getOrCreateShareLink — for the Share modal to check whether link-sharing is currently on, without turning it on just by opening the modal. */
export async function getActiveShareLink(resourceType: ShareableType, resourceId: string) {
  const existing = await prisma.shareLink.findFirst({
    where: {
      resourceType,
      resourceId,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });
  if (!existing) return { url: null };
  const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";
  return { url: `${webOrigin}/share/${existing.token}` };
}

export async function revokeShareLink(resourceType: ShareableType, resourceId: string) {
  await prisma.shareLink.updateMany({
    where: { resourceType, resourceId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Batch "is this resource currently shared, in any way" check, for isShared
 * badges in folder/file listings — true for an active "anyone with the
 * link" ShareLink OR at least one named-person Permission grant (including
 * a still-pending email invite, since that's a real sharing action already
 * in flight even before the recipient claims it).
 */
export async function activeShareResourceIds(
  resourceType: ShareableType,
  resourceIds: string[],
): Promise<Set<string>> {
  if (resourceIds.length === 0) return new Set();
  const [links, grants] = await Promise.all([
    prisma.shareLink.findMany({
      where: {
        resourceType,
        resourceId: { in: resourceIds },
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { resourceId: true },
    }),
    prisma.permission.findMany({
      where: { resourceType, resourceId: { in: resourceIds }, granteeType: "USER" },
      select: { resourceId: true },
    }),
  ]);
  return new Set([...links.map((l) => l.resourceId), ...grants.map((g) => g.resourceId)]);
}

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

export async function revokeShareLink(resourceType: ShareableType, resourceId: string) {
  await prisma.shareLink.updateMany({
    where: { resourceType, resourceId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Batch "is this resource currently shared" check, for annotating folder/file listings. */
export async function activeShareResourceIds(
  resourceType: ShareableType,
  resourceIds: string[],
): Promise<Set<string>> {
  if (resourceIds.length === 0) return new Set();
  const links = await prisma.shareLink.findMany({
    where: {
      resourceType,
      resourceId: { in: resourceIds },
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { resourceId: true },
  });
  return new Set(links.map((l) => l.resourceId));
}

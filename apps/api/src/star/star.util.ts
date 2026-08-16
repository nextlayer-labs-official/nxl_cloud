import { prisma } from "@nextlayer/database";

type StarableType = "FILE" | "FOLDER";

/** Idempotent — starring an already-starred item is a no-op, not an error (the unique constraint on [userId, resourceType, resourceId] would otherwise throw). */
export async function addStar(
  resourceType: StarableType,
  resourceId: string,
  organizationId: string,
  userId: string,
) {
  await prisma.star.upsert({
    where: { userId_resourceType_resourceId: { userId, resourceType, resourceId } },
    create: { organizationId, userId, resourceType, resourceId },
    update: {},
  });
}

export async function removeStar(resourceType: StarableType, resourceId: string, userId: string) {
  await prisma.star.deleteMany({ where: { userId, resourceType, resourceId } });
}

/** Batch "is this resource starred by me" check, for annotating folder/file listings — same shape as activeShareResourceIds. */
export async function activeStarResourceIds(
  resourceType: StarableType,
  resourceIds: string[],
  userId: string,
): Promise<Set<string>> {
  if (resourceIds.length === 0) return new Set();
  const stars = await prisma.star.findMany({
    where: { userId, resourceType, resourceId: { in: resourceIds } },
    select: { resourceId: true },
  });
  return new Set(stars.map((s) => s.resourceId));
}

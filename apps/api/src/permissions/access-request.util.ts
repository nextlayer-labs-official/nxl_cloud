import { prisma, type ResourceType } from "@nextlayer/database";

/**
 * "Request access" from someone who hit a file/folder they don't have
 * permission for (Drive-style). One row per (resource, requester), enforced
 * by the schema's unique constraint — re-requesting after a resolved
 * request resets it back to PENDING rather than piling up duplicates.
 */

export async function createOrRefreshAccessRequest(
  resourceType: ResourceType,
  resourceId: string,
  requestedById: string,
  message: string | undefined,
) {
  return prisma.accessRequest.upsert({
    where: {
      resourceType_resourceId_requestedById: { resourceType, resourceId, requestedById },
    },
    create: { resourceType, resourceId, requestedById, message: message ?? null },
    update: { status: "PENDING", message: message ?? null, resolvedById: null, resolvedAt: null },
  });
}

export async function getMyAccessRequest(resourceType: ResourceType, resourceId: string, userId: string) {
  return prisma.accessRequest.findUnique({
    where: {
      resourceType_resourceId_requestedById: { resourceType, resourceId, requestedById: userId },
    },
  });
}

/** Pending requests for a resource, joined with {id, name, email} — for the Share modal's "Access requests" section. */
export async function listPendingAccessRequests(resourceType: ResourceType, resourceId: string) {
  const requests = await prisma.accessRequest.findMany({
    where: { resourceType, resourceId, status: "PENDING" },
    orderBy: { createdAt: "asc" },
  });
  const userIds = requests.map((r) => r.requestedById);
  const users = userIds.length
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));
  return requests
    .map((r) => ({
      id: r.id,
      message: r.message,
      createdAt: r.createdAt,
      requestedBy: userMap.get(r.requestedById) ?? null,
    }))
    .filter((r) => r.requestedBy !== null) as {
    id: string;
    message: string | null;
    createdAt: Date;
    requestedBy: { id: string; name: string; email: string };
  }[];
}

export async function resolveAccessRequest(requestId: string, resolvedById: string, status: "GRANTED" | "DENIED") {
  return prisma.accessRequest.update({
    where: { id: requestId },
    data: { status, resolvedById, resolvedAt: new Date() },
  });
}

import { prisma, type AccessLevel, type ResourceType } from "@nextlayer/database";

/**
 * Real person-to-person sharing (Viewer/Editor grants), separate from
 * ShareLink's anonymous "anyone with the link" tokens — both models coexist,
 * matching how Drive/Dropbox offer link-sharing and named-person-sharing
 * side by side. `granteeId` has no FK (matches ShareLink/Star's existing
 * polymorphic-without-FK convention in this schema), so callers resolve it
 * against `User` manually.
 */

export async function grantPermission(
  resourceType: ResourceType,
  resourceId: string,
  granteeUserId: string,
  accessLevel: AccessLevel,
  createdById: string,
) {
  return prisma.permission.upsert({
    where: {
      resourceType_resourceId_granteeType_granteeId: {
        resourceType,
        resourceId,
        granteeType: "USER",
        granteeId: granteeUserId,
      },
    },
    create: { resourceType, resourceId, granteeType: "USER", granteeId: granteeUserId, accessLevel, createdById },
    update: { accessLevel },
  });
}

export async function revokePermission(resourceType: ResourceType, resourceId: string, granteeUserId: string) {
  await prisma.permission.deleteMany({
    where: { resourceType, resourceId, granteeType: "USER", granteeId: granteeUserId },
  });
}

/**
 * Dropbox/Drive-style invite: share with an email that has no account yet.
 * Grants nothing on its own — claimPendingGrants() adopts it into a real
 * grant the moment someone registers with a matching email. Upserts on
 * (resource, email) so re-inviting the same address just updates the level
 * instead of creating a duplicate pending row.
 */
export async function invitePendingGrant(
  resourceType: ResourceType,
  resourceId: string,
  email: string,
  accessLevel: AccessLevel,
  createdById: string,
) {
  return prisma.permission.upsert({
    where: {
      resourceType_resourceId_pendingEmail: { resourceType, resourceId, pendingEmail: email },
    },
    create: { resourceType, resourceId, granteeType: "USER", pendingEmail: email, accessLevel, createdById },
    update: { accessLevel },
  });
}

/** Called at registration — adopts every pending invite addressed to this email into a real grant for the new account. */
export async function claimPendingGrants(userId: string, email: string) {
  await prisma.permission.updateMany({
    where: { pendingEmail: email, granteeId: null },
    data: { granteeId: userId, pendingEmail: null },
  });
}

/** Grants (active + pending) joined with grantee info — for the "people with access" list in the share modal. */
export async function listResourcePermissions(resourceType: ResourceType, resourceId: string) {
  const grants = await prisma.permission.findMany({
    where: { resourceType, resourceId, granteeType: "USER" },
    orderBy: { createdAt: "asc" },
  });
  const userIds = grants.map((g) => g.granteeId).filter((id): id is string => !!id);
  const users = userIds.length
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  return grants
    .map((g) => {
      if (g.granteeId) {
        const user = userMap.get(g.granteeId);
        if (!user) return null;
        return { id: g.id, accessLevel: g.accessLevel, status: "ACTIVE" as const, user, pendingEmail: null };
      }
      if (g.pendingEmail) {
        return {
          id: g.id,
          accessLevel: g.accessLevel,
          status: "PENDING" as const,
          user: null,
          pendingEmail: g.pendingEmail,
        };
      }
      return null;
    })
    .filter((g): g is NonNullable<typeof g> => g !== null);
}

/** Direct grant on this exact resource only — no folder-inheritance walk. Pending (unclaimed) rows never match, since they have no granteeId yet. */
export async function getDirectAccessLevel(
  resourceType: ResourceType,
  resourceId: string,
  userId: string,
): Promise<AccessLevel | null> {
  const grant = await prisma.permission.findUnique({
    where: {
      resourceType_resourceId_granteeType_granteeId: {
        resourceType,
        resourceId,
        granteeType: "USER",
        granteeId: userId,
      },
    },
  });
  return grant?.accessLevel ?? null;
}

/** Walks upward through `parentId` (same primitive getBreadcrumb/move's cycle-check use), returning the first ancestor folder's grant found — this is how sharing a folder cascades to everything inside it. */
export async function getInheritedFolderAccess(
  userId: string,
  startFolderId: string | null,
): Promise<AccessLevel | null> {
  let currentId = startFolderId;
  while (currentId) {
    const direct = await getDirectAccessLevel("FOLDER", currentId, userId);
    if (direct) return direct;
    const folder = await prisma.folder.findUnique({ where: { id: currentId }, select: { parentId: true } });
    currentId = folder?.parentId ?? null;
  }
  return null;
}

export async function getSharedWithMe(userId: string) {
  const grants = await prisma.permission.findMany({ where: { granteeType: "USER", granteeId: userId } });
  return {
    folderIds: grants.filter((g) => g.resourceType === "FOLDER").map((g) => g.resourceId),
    fileIds: grants.filter((g) => g.resourceType === "FILE").map((g) => g.resourceId),
  };
}

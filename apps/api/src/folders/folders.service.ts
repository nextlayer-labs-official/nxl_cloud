import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma, type AccessLevel } from "@nextlayer/database";
import { recordAuditLog } from "../audit/audit-log.util";
import { EmailService } from "../email/email.service";
import { OrganizationsService } from "../organizations/organizations.service";
import {
  createOrRefreshAccessRequest,
  getMyAccessRequest,
  listPendingAccessRequests,
  resolveAccessRequest,
} from "../permissions/access-request.util";
import {
  getDirectAccessLevel,
  getInheritedFolderAccess,
  getSharedWithMe as getSharedWithMeIds,
  grantPermission,
  invitePendingGrant,
  listResourcePermissions,
} from "../permissions/permission.util";
import {
  activeShareResourceIds,
  getActiveShareLink,
  getOrCreateShareLink,
  revokeShareLink,
} from "../share/share-link.util";
import { activeStarResourceIds, addStar, removeStar } from "../star/star.util";
import { StorageService } from "../storage/storage.service";
import type { CreateFolderDto } from "./dto/create-folder.dto";
import type { MoveFolderDto } from "./dto/move-folder.dto";
import type { RenameFolderDto } from "./dto/rename-folder.dto";
import type { RequestAccessDto } from "./dto/request-access.dto";
import type { ResolveAccessRequestDto } from "./dto/resolve-access-request.dto";
import type { ShareWithUserDto } from "./dto/share-with-user.dto";

@Injectable()
export class FoldersService {
  constructor(
    private readonly organizations: OrganizationsService,
    private readonly storage: StorageService,
    private readonly email: EmailService,
  ) {}

  /**
   * Root ("My Files", no parentId) always stays scoped to the viewer's own
   * org — shared items never mix into it, only reachable via the dedicated
   * Shared view or a direct navigate into a shared folder, matching Drive.
   * A given `parentId` resolves access (own org, or a Viewer/Editor grant)
   * and lists children scoped to *that folder's* org, which may not be the
   * viewer's own — that's what makes browsing into a shared folder work.
   */
  async listContents(userId: string, parentId: string | undefined) {
    const membership = await this.organizations.getPrimaryMembership(userId);

    let organizationId = membership.organizationId;
    let accessLevel: "OWNER" | AccessLevel = "OWNER";
    if (parentId) {
      const resolved = await this.resolveFolderAccess(userId, parentId);
      organizationId = resolved.folder.organizationId;
      accessLevel = resolved.accessLevel;
    }

    const [folders, files] = await Promise.all([
      prisma.folder.findMany({
        where: { organizationId, parentId: parentId ?? null, deletedAt: null },
        orderBy: { name: "asc" },
      }),
      prisma.file.findMany({
        where: { organizationId, folderId: parentId ?? null, deletedAt: null },
        orderBy: { name: "asc" },
      }),
    ]);

    const [sharedFolderIds, sharedFileIds, starredFolderIds, starredFileIds] = await Promise.all([
      activeShareResourceIds(
        "FOLDER",
        folders.map((f) => f.id),
      ),
      activeShareResourceIds(
        "FILE",
        files.map((f) => f.id),
      ),
      activeStarResourceIds(
        "FOLDER",
        folders.map((f) => f.id),
        userId,
      ),
      activeStarResourceIds(
        "FILE",
        files.map((f) => f.id),
        userId,
      ),
    ]);

    return {
      accessLevel,
      folders: folders.map((f) => ({
        ...f,
        isShared: sharedFolderIds.has(f.id),
        isStarred: starredFolderIds.has(f.id),
      })),
      files: files.map((f) => ({
        ...f,
        isShared: sharedFileIds.has(f.id),
        isStarred: starredFileIds.has(f.id),
      })),
    };
  }

  /** Flat, org-wide name search across folders and files (not scoped to the current folder). */
  async search(userId: string, query: string) {
    const membership = await this.organizations.getPrimaryMembership(userId);
    const q = query.trim();
    if (!q) return { folders: [], files: [] };

    const [folders, files] = await Promise.all([
      prisma.folder.findMany({
        where: { organizationId: membership.organizationId, deletedAt: null, name: { contains: q } },
        include: { parent: { select: { name: true } } },
        orderBy: { name: "asc" },
        take: 25,
      }),
      prisma.file.findMany({
        where: { organizationId: membership.organizationId, deletedAt: null, name: { contains: q } },
        include: { folder: { select: { name: true } } },
        orderBy: { name: "asc" },
        take: 25,
      }),
    ]);

    const [sharedFolderIds, sharedFileIds, starredFolderIds, starredFileIds] = await Promise.all([
      activeShareResourceIds(
        "FOLDER",
        folders.map((f) => f.id),
      ),
      activeShareResourceIds(
        "FILE",
        files.map((f) => f.id),
      ),
      activeStarResourceIds(
        "FOLDER",
        folders.map((f) => f.id),
        userId,
      ),
      activeStarResourceIds(
        "FILE",
        files.map((f) => f.id),
        userId,
      ),
    ]);

    return {
      folders: folders.map((f) => ({
        id: f.id,
        name: f.name,
        parentId: f.parentId,
        createdAt: f.createdAt,
        parentName: f.parent?.name ?? "My Files",
        isShared: sharedFolderIds.has(f.id),
        isStarred: starredFolderIds.has(f.id),
      })),
      files: files.map((f) => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        sizeBytes: f.sizeBytes,
        folderId: f.folderId,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
        parentName: f.folder?.name ?? "My Files",
        isShared: sharedFileIds.has(f.id),
        isStarred: starredFileIds.has(f.id),
      })),
    };
  }

  async create(userId: string, dto: CreateFolderDto) {
    const membership = await this.organizations.getPrimaryMembership(userId);

    // New folder belongs to the parent's org — not necessarily the creator's
    // own, since an Editor-shared collaborator can create subfolders inside
    // someone else's shared folder (this is the one "adding new things"
    // capability in scope for shared Editors; genuine file upload isn't yet).
    let organizationId = membership.organizationId;
    if (dto.parentId) {
      const parent = await this.getAccessibleFolder(userId, dto.parentId, "EDITOR");
      organizationId = parent.organizationId;
    }

    const folder = await prisma.folder.create({
      data: {
        organizationId,
        parentId: dto.parentId ?? null,
        name: dto.name,
        createdById: userId,
      },
    });
    await this.logFolderActivity(folder, userId, "folder.created", { name: folder.name });
    return folder;
  }

  private async logFolderActivity(folder: { organizationId: string; id: string }, actorId: string, action: string, metadata?: Record<string, unknown>) {
    await recordAuditLog(folder.organizationId, actorId, action, "FOLDER", folder.id, metadata);
  }

  /**
   * Full ancestor chain from root to this folder, for breadcrumb navigation.
   * Only the starting folder's access is resolved (own org, or a
   * Viewer/Editor grant, direct or inherited) — once that's established the
   * ancestor walk itself just needs to exist and not be trashed, since access
   * to the starting folder already implies access to its own chain.
   */
  async getBreadcrumb(userId: string, folderId: string) {
    await this.resolveFolderAccess(userId, folderId);

    const trail: { id: string; name: string }[] = [];
    let currentId: string | null = folderId;

    while (currentId) {
      const folder = await prisma.folder.findUnique({ where: { id: currentId } });
      if (!folder || folder.deletedAt) {
        throw new NotFoundException("Folder not found.");
      }
      trail.unshift({ id: folder.id, name: folder.name });
      currentId = folder.parentId;
    }

    return trail;
  }

  private async getOwnedFolder(userId: string, folderId: string) {
    const membership = await this.organizations.getPrimaryMembership(userId);
    const folder = await prisma.folder.findUnique({ where: { id: folderId } });
    if (!folder || folder.organizationId !== membership.organizationId || folder.deletedAt) {
      throw new NotFoundException("Folder not found.");
    }
    return folder;
  }

  /**
   * Own org -> "OWNER" (today's exact rule). Otherwise a direct Permission
   * grant on this folder, or one inherited from its own parent chain —
   * sharing a folder cascades to every subfolder inside it. "Not found" on
   * no access, matching resolveFileAccess's reasoning in files.service.ts.
   */
  private async resolveFolderAccess(userId: string, folderId: string) {
    const membership = await this.organizations.getPrimaryMembership(userId);
    const folder = await prisma.folder.findUnique({ where: { id: folderId } });
    if (!folder || folder.deletedAt) throw new NotFoundException("Folder not found.");
    if (folder.organizationId === membership.organizationId) {
      return { folder, accessLevel: "OWNER" as const };
    }
    const direct = await getDirectAccessLevel("FOLDER", folder.id, userId);
    const level = direct ?? (await getInheritedFolderAccess(userId, folder.parentId));
    if (!level) throw new NotFoundException("Folder not found.");
    return { folder, accessLevel: level };
  }

  private async getAccessibleFolder(userId: string, folderId: string, minLevel: "VIEWER" | "EDITOR") {
    const { folder, accessLevel } = await this.resolveFolderAccess(userId, folderId);
    if (accessLevel === "OWNER") return folder;
    if (minLevel === "VIEWER") return folder;
    if (minLevel === "EDITOR" && accessLevel === "EDITOR") return folder;
    throw new NotFoundException("Folder not found.");
  }

  private async getTrashedFolder(userId: string, folderId: string) {
    const membership = await this.organizations.getPrimaryMembership(userId);
    const folder = await prisma.folder.findUnique({ where: { id: folderId } });
    if (!folder || folder.organizationId !== membership.organizationId || !folder.deletedAt) {
      throw new NotFoundException("Folder not found in trash.");
    }
    return folder;
  }

  /** BFS walk down the parent-child tree, collecting every descendant folder id (regardless of current trash state) — used to cascade trash/restore/permanent-delete across a whole subtree. */
  private async collectDescendantFolderIds(rootId: string): Promise<string[]> {
    const descendants: string[] = [];
    let frontier = [rootId];
    while (frontier.length > 0) {
      const children = await prisma.folder.findMany({
        where: { parentId: { in: frontier } },
        select: { id: true },
      });
      if (children.length === 0) break;
      const childIds = children.map((c) => c.id);
      descendants.push(...childIds);
      frontier = childIds;
    }
    return descendants;
  }

  /** Read-only — lets the Share modal show the current on/off state without turning link-sharing on just by opening it. */
  async getShareLinkStatus(userId: string, folderId: string) {
    const folder = await this.getOwnedFolder(userId, folderId);
    return getActiveShareLink("FOLDER", folder.id);
  }

  async createShareLink(userId: string, folderId: string) {
    const folder = await this.getOwnedFolder(userId, folderId);
    const link = await getOrCreateShareLink("FOLDER", folder.id, userId);
    await this.logFolderActivity(folder, userId, "folder.shared");
    return link;
  }

  async removeShareLink(userId: string, folderId: string) {
    const folder = await this.getOwnedFolder(userId, folderId);
    await revokeShareLink("FOLDER", folder.id);
    await this.logFolderActivity(folder, userId, "folder.unshared");
  }

  /** Sharing with an existing account grants real access immediately; an email with no account gets a Dropbox/Drive-style pending invite instead, claimed automatically the moment they register (see claimPendingGrants). */
  async sharePermission(userId: string, folderId: string, dto: ShareWithUserDto) {
    const folder = await this.getOwnedFolder(userId, folderId);
    const email = dto.email.toLowerCase().trim();

    const [sharer, grantee] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.user.findUnique({ where: { email } }),
    ]);
    if (grantee?.id === userId) {
      throw new ConflictException("You already own this folder.");
    }

    const sharerName = sharer?.name ?? "Someone";
    const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";
    const resourcePath = `/portal/folder/${folder.id}`;

    if (grantee) {
      await grantPermission("FOLDER", folder.id, grantee.id, dto.accessLevel, userId);
      await this.logFolderActivity(folder, userId, "folder.shared_with_user", { email, accessLevel: dto.accessLevel });
      await this.email.sendShareNotificationEmail(
        grantee.email,
        sharerName,
        folder.name,
        "folder",
        dto.accessLevel,
        `${webOrigin}${resourcePath}`,
      );
    } else {
      await invitePendingGrant("FOLDER", folder.id, email, dto.accessLevel, userId);
      await this.logFolderActivity(folder, userId, "folder.invited", { email, accessLevel: dto.accessLevel });
      const registerLink = `${webOrigin}/register?email=${encodeURIComponent(email)}&redirect=${encodeURIComponent(resourcePath)}`;
      await this.email.sendInviteEmail(email, sharerName, folder.name, "folder", dto.accessLevel, registerLink);
    }
    return listResourcePermissions("FOLDER", folder.id);
  }

  async listPermissions(userId: string, folderId: string) {
    const folder = await this.getOwnedFolder(userId, folderId);
    return listResourcePermissions("FOLDER", folder.id);
  }

  private async getOwnedPermission(userId: string, folderId: string, permissionId: string) {
    const folder = await this.getOwnedFolder(userId, folderId);
    const permission = await prisma.permission.findUnique({ where: { id: permissionId } });
    if (!permission || permission.resourceType !== "FOLDER" || permission.resourceId !== folder.id) {
      throw new NotFoundException("Grant not found.");
    }
    return { folder, permission };
  }

  async updatePermission(userId: string, folderId: string, permissionId: string, accessLevel: AccessLevel) {
    const { folder } = await this.getOwnedPermission(userId, folderId, permissionId);
    await prisma.permission.update({ where: { id: permissionId }, data: { accessLevel } });
    return listResourcePermissions("FOLDER", folder.id);
  }

  async revokePermission(userId: string, folderId: string, permissionId: string) {
    const { folder, permission } = await this.getOwnedPermission(userId, folderId, permissionId);
    await prisma.permission.delete({ where: { id: permissionId } });
    await this.logFolderActivity(folder, userId, "folder.unshared_from_user", {
      email: permission.pendingEmail ?? undefined,
    });
    return listResourcePermissions("FOLDER", folder.id);
  }

  /**
   * Non-throwing counterpart to resolveFolderAccess — a genuinely missing/deleted
   * folder is still a 404, but a folder that exists with no access reports back
   * so the frontend can offer "Request access" instead of a dead end.
   */
  async getAccessStatus(userId: string, folderId: string) {
    const membership = await this.organizations.getPrimaryMembership(userId);
    const folder = await prisma.folder.findUnique({ where: { id: folderId } });
    if (!folder || folder.deletedAt) throw new NotFoundException("Folder not found.");

    let accessLevel: "OWNER" | AccessLevel | null = null;
    if (folder.organizationId === membership.organizationId) {
      accessLevel = "OWNER";
    } else {
      const direct = await getDirectAccessLevel("FOLDER", folder.id, userId);
      accessLevel = direct ?? (await getInheritedFolderAccess(userId, folder.parentId));
    }

    if (accessLevel) return { hasAccess: true as const, accessLevel, name: folder.name };

    const myRequest = await getMyAccessRequest("FOLDER", folder.id, userId);
    return { hasAccess: false as const, name: folder.name, requestStatus: myRequest?.status ?? null };
  }

  async requestAccess(userId: string, folderId: string, dto: RequestAccessDto) {
    const membership = await this.organizations.getPrimaryMembership(userId);
    const folder = await prisma.folder.findUnique({ where: { id: folderId } });
    if (!folder || folder.deletedAt) throw new NotFoundException("Folder not found.");
    if (folder.organizationId === membership.organizationId) {
      throw new ConflictException("You already have access to this folder.");
    }
    const direct = await getDirectAccessLevel("FOLDER", folder.id, userId);
    const inherited = direct ?? (await getInheritedFolderAccess(userId, folder.parentId));
    if (inherited) throw new ConflictException("You already have access to this folder.");

    const request = await createOrRefreshAccessRequest("FOLDER", folder.id, userId, dto.message);
    await this.logFolderActivity(folder, userId, "folder.access_requested");

    const [requester, owner] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.user.findUnique({ where: { id: folder.createdById } }),
    ]);
    if (owner) {
      await this.email.sendAccessRequestEmail(
        owner.email,
        requester?.name ?? "Someone",
        folder.name,
        "folder",
        dto.message,
        `${process.env.WEB_ORIGIN ?? "http://localhost:3000"}/portal/folder/${folder.id}`,
      );
    }
    return { status: request.status };
  }

  /** Owner-only — pending requests for a folder they own. */
  async listAccessRequests(userId: string, folderId: string) {
    const folder = await this.getOwnedFolder(userId, folderId);
    return listPendingAccessRequests("FOLDER", folder.id);
  }

  /** Owner-only. GRANT reuses the same grantPermission()/notification path as a normal share; DENY just dismisses the request and lets the requester know. */
  async resolveFolderAccessRequest(
    userId: string,
    folderId: string,
    requestId: string,
    dto: ResolveAccessRequestDto,
  ) {
    const folder = await this.getOwnedFolder(userId, folderId);
    const request = await prisma.accessRequest.findUnique({ where: { id: requestId } });
    if (!request || request.resourceType !== "FOLDER" || request.resourceId !== folder.id) {
      throw new NotFoundException("Request not found.");
    }
    const requester = await prisma.user.findUnique({ where: { id: request.requestedById } });
    if (!requester) throw new NotFoundException("Request not found.");

    if (dto.decision === "GRANT") {
      const accessLevel = dto.accessLevel ?? "VIEWER";
      await resolveAccessRequest(request.id, userId, "GRANTED");
      await grantPermission("FOLDER", folder.id, requester.id, accessLevel, userId);
      await this.logFolderActivity(folder, userId, "folder.shared_with_user", {
        email: requester.email,
        accessLevel,
      });
      const sharer = await prisma.user.findUnique({ where: { id: userId } });
      await this.email.sendShareNotificationEmail(
        requester.email,
        sharer?.name ?? "Someone",
        folder.name,
        "folder",
        accessLevel,
        `${process.env.WEB_ORIGIN ?? "http://localhost:3000"}/portal/folder/${folder.id}`,
      );
    } else {
      await resolveAccessRequest(request.id, userId, "DENIED");
      await this.logFolderActivity(folder, userId, "folder.access_request_denied", { email: requester.email });
      await this.email.sendAccessDeniedEmail(requester.email, folder.name, "folder");
    }

    return listPendingAccessRequests("FOLDER", folder.id);
  }

  /** Folders/files directly shared with this user — not org-scoped, since they belong to other orgs by definition. Annotated with the owning org's name for "shared by X" context in the UI. */
  async getSharedWithMe(userId: string) {
    const { folderIds, fileIds } = await getSharedWithMeIds(userId);

    const [folders, files] = await Promise.all([
      folderIds.length
        ? prisma.folder.findMany({
            where: { id: { in: folderIds }, deletedAt: null },
            include: { organization: { select: { name: true } } },
          })
        : Promise.resolve([]),
      fileIds.length
        ? prisma.file.findMany({
            where: { id: { in: fileIds }, deletedAt: null },
            include: { organization: { select: { name: true } } },
          })
        : Promise.resolve([]),
    ]);

    const [sharedFolderIds, sharedFileIds, starredFolderIds, starredFileIds] = await Promise.all([
      activeShareResourceIds(
        "FOLDER",
        folders.map((f) => f.id),
      ),
      activeShareResourceIds(
        "FILE",
        files.map((f) => f.id),
      ),
      activeStarResourceIds(
        "FOLDER",
        folders.map((f) => f.id),
        userId,
      ),
      activeStarResourceIds(
        "FILE",
        files.map((f) => f.id),
        userId,
      ),
    ]);

    return {
      folders: folders.map(({ organization, ...f }) => ({
        ...f,
        isShared: sharedFolderIds.has(f.id),
        isStarred: starredFolderIds.has(f.id),
        sharedByOrgName: organization.name,
      })),
      files: files.map(({ organization, ...f }) => ({
        ...f,
        isShared: sharedFileIds.has(f.id),
        isStarred: starredFileIds.has(f.id),
        sharedByOrgName: organization.name,
      })),
    };
  }

  async rename(userId: string, folderId: string, dto: RenameFolderDto) {
    const folder = await this.getAccessibleFolder(userId, folderId, "EDITOR");
    const name = dto.name.trim();
    if (!name) throw new BadRequestException("Name can't be empty.");
    const updated = await prisma.folder.update({ where: { id: folder.id }, data: { name } });
    await this.logFolderActivity(folder, userId, "folder.renamed", { from: folder.name, to: name });
    return updated;
  }

  /**
   * Moving into a descendant (or into itself) would detach the folder's own
   * subtree from the org, so this walks upward from the destination through
   * `parentId` (same primitive `getBreadcrumb` uses) and rejects if that walk
   * ever reaches the folder being moved.
   */
  async move(userId: string, folderId: string, dto: MoveFolderDto) {
    const folder = await this.getOwnedFolder(userId, folderId);
    const parentId = dto.parentId ?? null;

    if (parentId) {
      let currentId: string | null = parentId;
      while (currentId) {
        if (currentId === folder.id) {
          throw new BadRequestException("Can't move a folder into itself or one of its own subfolders.");
        }
        const current: { parentId: string | null; organizationId: string; deletedAt: Date | null } | null =
          await prisma.folder.findUnique({
            where: { id: currentId },
            select: { parentId: true, organizationId: true, deletedAt: true },
          });
        if (!current || current.organizationId !== folder.organizationId || current.deletedAt) {
          throw new NotFoundException("Folder not found.");
        }
        currentId = current.parentId;
      }
    }

    const updated = await prisma.folder.update({ where: { id: folder.id }, data: { parentId } });
    await this.logFolderActivity(folder, userId, "folder.moved", {
      fromParentId: folder.parentId,
      toParentId: parentId,
    });
    return updated;
  }

  async getActivity(userId: string, folderId: string) {
    const folder = await this.getOwnedFolder(userId, folderId);
    return prisma.auditLog.findMany({
      where: { targetType: "FOLDER", targetId: folder.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { actor: { select: { name: true, email: true } } },
    });
  }

  /**
   * Soft delete, cascading to every descendant folder and file — mirrors
   * File.remove()'s trash semantics instead of requiring an empty folder.
   * The Wasabi objects are untouched here; permanentlyDelete is what actually
   * removes them, same split as files use.
   */
  /** EDITOR-minimum (not owner-only) — matches Dropbox/Drive, where an editor on shared content can delete it; restore/permanentlyDelete/move/share stay owner-only. */
  async remove(userId: string, folderId: string) {
    const folder = await this.getAccessibleFolder(userId, folderId, "EDITOR");
    const descendantIds = await this.collectDescendantFolderIds(folder.id);
    const allFolderIds = [folder.id, ...descendantIds];
    const now = new Date();

    await prisma.$transaction([
      prisma.folder.updateMany({ where: { id: { in: allFolderIds } }, data: { deletedAt: now } }),
      prisma.file.updateMany({
        where: { folderId: { in: allFolderIds }, deletedAt: null },
        data: { deletedAt: now },
      }),
    ]);
    await this.logFolderActivity(folder, userId, "folder.trashed");
  }

  /**
   * Restores this folder and every currently-trashed descendant folder/file
   * under it — a simplification: it doesn't try to distinguish "trashed as
   * part of this same delete" from "happened to already be trashed
   * independently," it just restores everything in the subtree that's
   * currently marked deleted.
   */
  async restore(userId: string, folderId: string) {
    const folder = await this.getTrashedFolder(userId, folderId);
    const descendantIds = await this.collectDescendantFolderIds(folder.id);
    const allFolderIds = [folder.id, ...descendantIds];

    await prisma.$transaction([
      prisma.folder.updateMany({ where: { id: { in: allFolderIds } }, data: { deletedAt: null } }),
      prisma.file.updateMany({ where: { folderId: { in: allFolderIds } }, data: { deletedAt: null } }),
    ]);
    await this.logFolderActivity(folder, userId, "folder.restored");
  }

  /** Permanently removes this trashed folder, every descendant folder, and every file under the whole subtree (Wasabi objects included). */
  async permanentlyDelete(userId: string, folderId: string) {
    const folder = await this.getTrashedFolder(userId, folderId);
    const descendantIds = await this.collectDescendantFolderIds(folder.id);
    const allFolderIds = [folder.id, ...descendantIds];

    const filesToDelete = await prisma.file.findMany({ where: { folderId: { in: allFolderIds } } });
    await Promise.all(filesToDelete.map((f) => this.storage.deleteObject(f.storageKey)));
    await prisma.file.deleteMany({ where: { folderId: { in: allFolderIds } } });
    // Deleting just the root cascades to every descendant folder automatically —
    // Folder.parent has onDelete: Cascade (files don't, hence the explicit cleanup above).
    await prisma.folder.delete({ where: { id: folder.id } });
    await this.logFolderActivity(folder, userId, "folder.deleted");
  }

  /** Only "root" trashed folders — ones whose parent isn't also trashed — so a folder swept up by trashing its parent doesn't also show as its own separate Trash entry. Since a trashed parent would appear in this very same query (same org), no second query is needed to know which parents are trashed. */
  async listTrash(userId: string) {
    const membership = await this.organizations.getPrimaryMembership(userId);
    const trashed = await prisma.folder.findMany({
      where: { organizationId: membership.organizationId, deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
    });
    const trashedIds = new Set(trashed.map((f) => f.id));
    return trashed.filter((f) => !f.parentId || !trashedIds.has(f.parentId));
  }

  async star(userId: string, folderId: string) {
    const folder = await this.getAccessibleFolder(userId, folderId, "VIEWER");
    await addStar("FOLDER", folder.id, folder.organizationId, userId);
  }

  async unstar(userId: string, folderId: string) {
    const folder = await this.getAccessibleFolder(userId, folderId, "VIEWER");
    await removeStar("FOLDER", folder.id, userId);
  }

  /** Cross-cuts both models from the Star table — same "one method, combined {folders, files} shape" precedent `search()` already establishes. */
  async getStarred(userId: string) {
    const membership = await this.organizations.getPrimaryMembership(userId);
    const stars = await prisma.star.findMany({
      where: { userId, organizationId: membership.organizationId },
      orderBy: { createdAt: "desc" },
    });
    const folderIds = stars.filter((s) => s.resourceType === "FOLDER").map((s) => s.resourceId);
    const fileIds = stars.filter((s) => s.resourceType === "FILE").map((s) => s.resourceId);

    const [folders, files] = await Promise.all([
      folderIds.length
        ? prisma.folder.findMany({
            where: { id: { in: folderIds }, organizationId: membership.organizationId, deletedAt: null },
          })
        : Promise.resolve([]),
      fileIds.length
        ? prisma.file.findMany({
            where: { id: { in: fileIds }, organizationId: membership.organizationId, deletedAt: null },
          })
        : Promise.resolve([]),
    ]);

    const [sharedFolderIds, sharedFileIds] = await Promise.all([
      activeShareResourceIds(
        "FOLDER",
        folders.map((f) => f.id),
      ),
      activeShareResourceIds(
        "FILE",
        files.map((f) => f.id),
      ),
    ]);

    return {
      folders: folders.map((f) => ({ ...f, isShared: sharedFolderIds.has(f.id), isStarred: true })),
      files: files.map((f) => ({ ...f, isShared: sharedFileIds.has(f.id), isStarred: true })),
    };
  }
}

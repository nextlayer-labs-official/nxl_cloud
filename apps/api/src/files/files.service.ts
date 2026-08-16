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
import type { ConfirmUploadDto } from "./dto/confirm-upload.dto";
import type { MoveFileDto } from "./dto/move-file.dto";
import type { RenameFileDto } from "./dto/rename-file.dto";
import type { RequestAccessDto } from "./dto/request-access.dto";
import type { RequestUploadUrlDto } from "./dto/request-upload-url.dto";
import type { ResolveAccessRequestDto } from "./dto/resolve-access-request.dto";
import type { ShareWithUserDto } from "./dto/share-with-user.dto";

@Injectable()
export class FilesService {
  constructor(
    private readonly organizations: OrganizationsService,
    private readonly storage: StorageService,
    private readonly email: EmailService,
  ) {}

  private async assertFolderInOrg(folderId: string | undefined, organizationId: string) {
    if (!folderId) return;
    const folder = await prisma.folder.findUnique({ where: { id: folderId } });
    if (!folder || folder.organizationId !== organizationId || folder.deletedAt) {
      throw new NotFoundException("Folder not found.");
    }
  }

  /**
   * Own org -> upload directly. Otherwise the target folder must be shared to
   * this user at EDITOR (a Viewer can browse but not add files) — mirrors
   * resolveFileAccess/resolveFolderAccess's own-org -> direct -> inherited
   * resolution below. Returns the folder's own org so an uploaded file's
   * storage key, quota charge, and ownership all land on the folder's owner,
   * not the uploader — same as a new subfolder already does in create().
   */
  private async resolveUploadFolder(userId: string, folderId: string | undefined) {
    const membership = await this.organizations.getPrimaryMembership(userId);
    if (!folderId) {
      return { organizationId: membership.organizationId, orgSlug: membership.organization.slug };
    }
    const folder = await prisma.folder.findUnique({ where: { id: folderId } });
    if (!folder || folder.deletedAt) throw new NotFoundException("Folder not found.");
    if (folder.organizationId === membership.organizationId) {
      return { organizationId: folder.organizationId, orgSlug: membership.organization.slug };
    }
    const direct = await getDirectAccessLevel("FOLDER", folder.id, userId);
    const level = direct ?? (await getInheritedFolderAccess(userId, folder.parentId));
    if (level !== "EDITOR") throw new NotFoundException("Folder not found.");
    const org = await prisma.organization.findUnique({ where: { id: folder.organizationId } });
    if (!org) throw new NotFoundException("Folder not found.");
    return { organizationId: folder.organizationId, orgSlug: org.slug };
  }

  async requestUploadUrl(userId: string, dto: RequestUploadUrlDto) {
    const { organizationId, orgSlug } = await this.resolveUploadFolder(userId, dto.folderId);
    await this.organizations.assertWithinQuota(organizationId, dto.sizeBytes);

    const storageKey = this.storage.buildKey(orgSlug, dto.name);
    const uploadUrl = await this.storage.getUploadUrl(storageKey, dto.mimeType);

    return { uploadUrl, storageKey };
  }

  async confirmUpload(userId: string, dto: ConfirmUploadDto) {
    const { organizationId } = await this.resolveUploadFolder(userId, dto.folderId);

    const file = await prisma.$transaction(async (tx) => {
      const created = await tx.file.create({
        data: {
          organizationId,
          folderId: dto.folderId ?? null,
          name: dto.name,
          mimeType: dto.mimeType,
          sizeBytes: dto.sizeBytes,
          storageKey: dto.storageKey,
          uploadedById: userId,
        },
      });
      await tx.fileVersion.create({
        data: {
          fileId: created.id,
          versionNumber: 1,
          storageKey: dto.storageKey,
          sizeBytes: dto.sizeBytes,
          createdById: userId,
        },
      });
      return created;
    });
    await this.logFileActivity(file, userId, "file.uploaded", { name: file.name, sizeBytes: file.sizeBytes });
    return file;
  }

  private async logFileActivity(file: { organizationId: string; id: string }, actorId: string, action: string, metadata?: Record<string, unknown>) {
    await recordAuditLog(file.organizationId, actorId, action, "FILE", file.id, metadata);
  }

  private async getOwnedFile(userId: string, fileId: string) {
    const membership = await this.organizations.getPrimaryMembership(userId);
    const file = await prisma.file.findUnique({ where: { id: fileId } });
    if (!file || file.organizationId !== membership.organizationId || file.deletedAt) {
      throw new NotFoundException("File not found.");
    }
    return file;
  }

  /**
   * Own org -> "OWNER" (today's exact rule). Otherwise a direct Permission
   * grant on the file, or one inherited from the file's own folder (or that
   * folder's ancestors) — sharing a folder cascades to files inside it.
   * "Not found" (not "forbidden") on no access, so a share-less non-member
   * can't distinguish "doesn't exist" from "not shared with you".
   */
  private async resolveFileAccess(userId: string, fileId: string) {
    const membership = await this.organizations.getPrimaryMembership(userId);
    const file = await prisma.file.findUnique({ where: { id: fileId } });
    if (!file || file.deletedAt) throw new NotFoundException("File not found.");
    if (file.organizationId === membership.organizationId) {
      return { file, accessLevel: "OWNER" as const };
    }
    const direct = await getDirectAccessLevel("FILE", file.id, userId);
    const level = direct ?? (await getInheritedFolderAccess(userId, file.folderId));
    if (!level) throw new NotFoundException("File not found.");
    return { file, accessLevel: level };
  }

  private async getAccessibleFile(userId: string, fileId: string, minLevel: "VIEWER" | "EDITOR") {
    const { file, accessLevel } = await this.resolveFileAccess(userId, fileId);
    if (accessLevel === "OWNER") return file;
    if (minLevel === "VIEWER") return file;
    if (minLevel === "EDITOR" && accessLevel === "EDITOR") return file;
    throw new NotFoundException("File not found.");
  }

  async getDownloadUrl(userId: string, fileId: string) {
    const file = await this.getAccessibleFile(userId, fileId, "VIEWER");
    const downloadUrl = await this.storage.getDownloadUrl(file.storageKey, file.name);
    return { downloadUrl };
  }

  /** Same object, but `Content-Disposition: inline` so the browser renders it (img/iframe/etc) instead of downloading. */
  async getPreviewUrl(userId: string, fileId: string) {
    const file = await this.getAccessibleFile(userId, fileId, "VIEWER");
    const previewUrl = await this.storage.getDownloadUrl(file.storageKey, file.name, true);
    return { previewUrl };
  }

  /** Backs the standalone /portal/file/[fileId] deep link a share email points at — same VIEWER-minimum access as download/preview. */
  async getFile(userId: string, fileId: string) {
    const file = await this.getAccessibleFile(userId, fileId, "VIEWER");
    const [sharedIds, starredIds] = await Promise.all([
      activeShareResourceIds("FILE", [file.id]),
      activeStarResourceIds("FILE", [file.id], userId),
    ]);
    return { ...file, isShared: sharedIds.has(file.id), isStarred: starredIds.has(file.id) };
  }

  /**
   * Soft delete only — moves the file to Trash. The Wasabi object is kept
   * until `permanentlyDelete` is called, so `restore` has something to
   * restore. EDITOR-minimum (not owner-only) — matches Dropbox/Drive, where
   * an editor on shared content can delete it; restoring/permanently
   * deleting from Trash and moving/sharing stay owner-only below.
   */
  async remove(userId: string, fileId: string) {
    const file = await this.getAccessibleFile(userId, fileId, "EDITOR");
    await prisma.file.update({ where: { id: file.id }, data: { deletedAt: new Date() } });
    await this.logFileActivity(file, userId, "file.trashed");
  }

  async rename(userId: string, fileId: string, dto: RenameFileDto) {
    const file = await this.getAccessibleFile(userId, fileId, "EDITOR");
    const name = dto.name.trim();
    if (!name) throw new BadRequestException("Name can't be empty.");
    const updated = await prisma.file.update({ where: { id: file.id }, data: { name } });
    await this.logFileActivity(file, userId, "file.renamed", { from: file.name, to: name });
    return updated;
  }

  async move(userId: string, fileId: string, dto: MoveFileDto) {
    const file = await this.getOwnedFile(userId, fileId);
    const folderId = dto.folderId ?? null;
    await this.assertFolderInOrg(folderId ?? undefined, file.organizationId);
    const updated = await prisma.file.update({ where: { id: file.id }, data: { folderId } });
    await this.logFileActivity(file, userId, "file.moved", {
      fromFolderId: file.folderId,
      toFolderId: folderId,
    });
    return updated;
  }

  async getActivity(userId: string, fileId: string) {
    const file = await this.getAccessibleFile(userId, fileId, "VIEWER");
    return prisma.auditLog.findMany({
      where: { targetType: "FILE", targetId: file.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { actor: { select: { name: true, email: true } } },
    });
  }

  private async getTrashedFile(userId: string, fileId: string) {
    const membership = await this.organizations.getPrimaryMembership(userId);
    const file = await prisma.file.findUnique({ where: { id: fileId } });
    if (!file || file.organizationId !== membership.organizationId || !file.deletedAt) {
      throw new NotFoundException("File not found in trash.");
    }
    return file;
  }

  /** Only files not already swept up by a trashed containing folder — those show up under that folder's own Trash entry instead, not flatly duplicated here. */
  async listTrash(userId: string) {
    const membership = await this.organizations.getPrimaryMembership(userId);
    const [trashedFolders, trashed] = await Promise.all([
      prisma.folder.findMany({
        where: { organizationId: membership.organizationId, deletedAt: { not: null } },
        select: { id: true },
      }),
      prisma.file.findMany({
        where: { organizationId: membership.organizationId, deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" },
      }),
    ]);
    const trashedFolderIds = new Set(trashedFolders.map((f) => f.id));
    return trashed.filter((f) => !f.folderId || !trashedFolderIds.has(f.folderId));
  }

  async restore(userId: string, fileId: string) {
    const file = await this.getTrashedFile(userId, fileId);
    await prisma.file.update({ where: { id: file.id }, data: { deletedAt: null } });
    await this.logFileActivity(file, userId, "file.restored");
  }

  async permanentlyDelete(userId: string, fileId: string) {
    const file = await this.getTrashedFile(userId, fileId);
    await this.storage.deleteObject(file.storageKey);
    await prisma.file.delete({ where: { id: file.id } });
    await this.logFileActivity(file, userId, "file.deleted");
  }

  /** Read-only — lets the Share modal show the current on/off state without turning link-sharing on just by opening it. */
  async getShareLinkStatus(userId: string, fileId: string) {
    const file = await this.getOwnedFile(userId, fileId);
    return getActiveShareLink("FILE", file.id);
  }

  async createShareLink(userId: string, fileId: string) {
    const file = await this.getOwnedFile(userId, fileId);
    const link = await getOrCreateShareLink("FILE", file.id, userId);
    await this.logFileActivity(file, userId, "file.shared");
    return link;
  }

  async removeShareLink(userId: string, fileId: string) {
    const file = await this.getOwnedFile(userId, fileId);
    await revokeShareLink("FILE", file.id);
    await this.logFileActivity(file, userId, "file.unshared");
  }

  /** Sharing with an existing account grants real access immediately; an email with no account gets a Dropbox/Drive-style pending invite instead, claimed automatically the moment they register (see claimPendingGrants). */
  async sharePermission(userId: string, fileId: string, dto: ShareWithUserDto) {
    const file = await this.getOwnedFile(userId, fileId);
    const email = dto.email.toLowerCase().trim();

    const [sharer, grantee] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.user.findUnique({ where: { email } }),
    ]);
    if (grantee?.id === userId) {
      throw new ConflictException("You already own this file.");
    }

    const sharerName = sharer?.name ?? "Someone";
    const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";
    const resourcePath = `/portal/file/${file.id}`;

    if (grantee) {
      await grantPermission("FILE", file.id, grantee.id, dto.accessLevel, userId);
      await this.logFileActivity(file, userId, "file.shared_with_user", { email, accessLevel: dto.accessLevel });
      await this.email.sendShareNotificationEmail(
        grantee.email,
        sharerName,
        file.name,
        "file",
        dto.accessLevel,
        `${webOrigin}${resourcePath}`,
      );
    } else {
      await invitePendingGrant("FILE", file.id, email, dto.accessLevel, userId);
      await this.logFileActivity(file, userId, "file.invited", { email, accessLevel: dto.accessLevel });
      const registerLink = `${webOrigin}/register?email=${encodeURIComponent(email)}&redirect=${encodeURIComponent(resourcePath)}`;
      await this.email.sendInviteEmail(email, sharerName, file.name, "file", dto.accessLevel, registerLink);
    }
    return listResourcePermissions("FILE", file.id);
  }

  async listPermissions(userId: string, fileId: string) {
    const file = await this.getOwnedFile(userId, fileId);
    return listResourcePermissions("FILE", file.id);
  }

  private async getOwnedPermission(userId: string, fileId: string, permissionId: string) {
    const file = await this.getOwnedFile(userId, fileId);
    const permission = await prisma.permission.findUnique({ where: { id: permissionId } });
    if (!permission || permission.resourceType !== "FILE" || permission.resourceId !== file.id) {
      throw new NotFoundException("Grant not found.");
    }
    return { file, permission };
  }

  async updatePermission(userId: string, fileId: string, permissionId: string, accessLevel: AccessLevel) {
    const { file } = await this.getOwnedPermission(userId, fileId, permissionId);
    await prisma.permission.update({ where: { id: permissionId }, data: { accessLevel } });
    return listResourcePermissions("FILE", file.id);
  }

  async revokePermission(userId: string, fileId: string, permissionId: string) {
    const { file, permission } = await this.getOwnedPermission(userId, fileId, permissionId);
    await prisma.permission.delete({ where: { id: permissionId } });
    await this.logFileActivity(file, userId, "file.unshared_from_user", {
      email: permission.pendingEmail ?? undefined,
    });
    return listResourcePermissions("FILE", file.id);
  }

  /**
   * Non-throwing counterpart to resolveFileAccess — a genuinely missing/deleted
   * file is still a 404, but a file that exists with no access reports back so
   * the frontend can offer "Request access" instead of a dead end.
   */
  async getAccessStatus(userId: string, fileId: string) {
    const membership = await this.organizations.getPrimaryMembership(userId);
    const file = await prisma.file.findUnique({ where: { id: fileId } });
    if (!file || file.deletedAt) throw new NotFoundException("File not found.");

    let accessLevel: "OWNER" | AccessLevel | null = null;
    if (file.organizationId === membership.organizationId) {
      accessLevel = "OWNER";
    } else {
      const direct = await getDirectAccessLevel("FILE", file.id, userId);
      accessLevel = direct ?? (await getInheritedFolderAccess(userId, file.folderId));
    }

    if (accessLevel) return { hasAccess: true as const, accessLevel, name: file.name };

    const myRequest = await getMyAccessRequest("FILE", file.id, userId);
    return { hasAccess: false as const, name: file.name, requestStatus: myRequest?.status ?? null };
  }

  async requestAccess(userId: string, fileId: string, dto: RequestAccessDto) {
    const membership = await this.organizations.getPrimaryMembership(userId);
    const file = await prisma.file.findUnique({ where: { id: fileId } });
    if (!file || file.deletedAt) throw new NotFoundException("File not found.");
    if (file.organizationId === membership.organizationId) {
      throw new ConflictException("You already have access to this file.");
    }
    const direct = await getDirectAccessLevel("FILE", file.id, userId);
    const inherited = direct ?? (await getInheritedFolderAccess(userId, file.folderId));
    if (inherited) throw new ConflictException("You already have access to this file.");

    const request = await createOrRefreshAccessRequest("FILE", file.id, userId, dto.message);
    await this.logFileActivity(file, userId, "file.access_requested");

    const [requester, owner] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.user.findUnique({ where: { id: file.uploadedById } }),
    ]);
    if (owner) {
      await this.email.sendAccessRequestEmail(
        owner.email,
        requester?.name ?? "Someone",
        file.name,
        "file",
        dto.message,
        `${process.env.WEB_ORIGIN ?? "http://localhost:3000"}/portal/file/${file.id}`,
      );
    }
    return { status: request.status };
  }

  /** Owner-only — pending requests for a file they own. */
  async listAccessRequests(userId: string, fileId: string) {
    const file = await this.getOwnedFile(userId, fileId);
    return listPendingAccessRequests("FILE", file.id);
  }

  /** Owner-only. GRANT reuses the same grantPermission()/notification path as a normal share; DENY just dismisses the request and lets the requester know. */
  async resolveFileAccessRequest(
    userId: string,
    fileId: string,
    requestId: string,
    dto: ResolveAccessRequestDto,
  ) {
    const file = await this.getOwnedFile(userId, fileId);
    const request = await prisma.accessRequest.findUnique({ where: { id: requestId } });
    if (!request || request.resourceType !== "FILE" || request.resourceId !== file.id) {
      throw new NotFoundException("Request not found.");
    }
    const requester = await prisma.user.findUnique({ where: { id: request.requestedById } });
    if (!requester) throw new NotFoundException("Request not found.");

    if (dto.decision === "GRANT") {
      const accessLevel = dto.accessLevel ?? "VIEWER";
      await resolveAccessRequest(request.id, userId, "GRANTED");
      await grantPermission("FILE", file.id, requester.id, accessLevel, userId);
      await this.logFileActivity(file, userId, "file.shared_with_user", {
        email: requester.email,
        accessLevel,
      });
      const sharer = await prisma.user.findUnique({ where: { id: userId } });
      await this.email.sendShareNotificationEmail(
        requester.email,
        sharer?.name ?? "Someone",
        file.name,
        "file",
        accessLevel,
        `${process.env.WEB_ORIGIN ?? "http://localhost:3000"}/portal/file/${file.id}`,
      );
    } else {
      await resolveAccessRequest(request.id, userId, "DENIED");
      await this.logFileActivity(file, userId, "file.access_request_denied", { email: requester.email });
      await this.email.sendAccessDeniedEmail(requester.email, file.name, "file");
    }

    return listPendingAccessRequests("FILE", file.id);
  }

  async star(userId: string, fileId: string) {
    const file = await this.getAccessibleFile(userId, fileId, "VIEWER");
    await addStar("FILE", file.id, file.organizationId, userId);
  }

  async unstar(userId: string, fileId: string) {
    const file = await this.getAccessibleFile(userId, fileId, "VIEWER");
    await removeStar("FILE", file.id, userId);
  }

  /** "Recently touched" (by anyone in the org), not "recently opened by me" — there's no per-user open-tracking, so this is upload/modify recency, org-wide. */
  async getRecent(userId: string) {
    const membership = await this.organizations.getPrimaryMembership(userId);
    const files = await prisma.file.findMany({
      where: { organizationId: membership.organizationId, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });
    const [sharedIds, starredIds] = await Promise.all([
      activeShareResourceIds(
        "FILE",
        files.map((f) => f.id),
      ),
      activeStarResourceIds(
        "FILE",
        files.map((f) => f.id),
        userId,
      ),
    ]);
    return files.map((f) => ({ ...f, isShared: sharedIds.has(f.id), isStarred: starredIds.has(f.id) }));
  }
}

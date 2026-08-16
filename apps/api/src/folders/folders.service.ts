import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@nextlayer/database";
import { recordAuditLog } from "../audit/audit-log.util";
import { OrganizationsService } from "../organizations/organizations.service";
import { activeShareResourceIds, getOrCreateShareLink, revokeShareLink } from "../share/share-link.util";
import { activeStarResourceIds, addStar, removeStar } from "../star/star.util";
import type { CreateFolderDto } from "./dto/create-folder.dto";
import type { MoveFolderDto } from "./dto/move-folder.dto";
import type { RenameFolderDto } from "./dto/rename-folder.dto";

@Injectable()
export class FoldersService {
  constructor(private readonly organizations: OrganizationsService) {}

  async listContents(userId: string, parentId: string | undefined) {
    const membership = await this.organizations.getPrimaryMembership(userId);

    if (parentId) {
      const parent = await prisma.folder.findUnique({ where: { id: parentId } });
      if (!parent || parent.organizationId !== membership.organizationId) {
        throw new NotFoundException("Folder not found.");
      }
    }

    const [folders, files] = await Promise.all([
      prisma.folder.findMany({
        where: { organizationId: membership.organizationId, parentId: parentId ?? null },
        orderBy: { name: "asc" },
      }),
      prisma.file.findMany({
        where: {
          organizationId: membership.organizationId,
          folderId: parentId ?? null,
          deletedAt: null,
        },
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
        where: { organizationId: membership.organizationId, name: { contains: q } },
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
        parentName: f.folder?.name ?? "My Files",
        isShared: sharedFileIds.has(f.id),
        isStarred: starredFileIds.has(f.id),
      })),
    };
  }

  async create(userId: string, dto: CreateFolderDto) {
    const membership = await this.organizations.getPrimaryMembership(userId);

    if (dto.parentId) {
      const parent = await prisma.folder.findUnique({ where: { id: dto.parentId } });
      if (!parent || parent.organizationId !== membership.organizationId) {
        throw new NotFoundException("Parent folder not found.");
      }
    }

    const folder = await prisma.folder.create({
      data: {
        organizationId: membership.organizationId,
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

  /** Full ancestor chain from root to this folder, for breadcrumb navigation. */
  async getBreadcrumb(userId: string, folderId: string) {
    const membership = await this.organizations.getPrimaryMembership(userId);
    const trail: { id: string; name: string }[] = [];
    let currentId: string | null = folderId;

    while (currentId) {
      const folder = await prisma.folder.findUnique({ where: { id: currentId } });
      if (!folder || folder.organizationId !== membership.organizationId) {
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
    if (!folder || folder.organizationId !== membership.organizationId) {
      throw new NotFoundException("Folder not found.");
    }
    return folder;
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

  async rename(userId: string, folderId: string, dto: RenameFolderDto) {
    const folder = await this.getOwnedFolder(userId, folderId);
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
        const current: { parentId: string | null; organizationId: string } | null = await prisma.folder.findUnique({
          where: { id: currentId },
          select: { parentId: true, organizationId: true },
        });
        if (!current || current.organizationId !== folder.organizationId) {
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

  async remove(userId: string, folderId: string) {
    const folder = await this.getOwnedFolder(userId, folderId);

    const [childFolderCount, fileCount] = await Promise.all([
      prisma.folder.count({ where: { parentId: folderId } }),
      prisma.file.count({ where: { folderId, deletedAt: null } }),
    ]);
    if (childFolderCount > 0 || fileCount > 0) {
      throw new BadRequestException("Folder must be empty before it can be deleted.");
    }

    await prisma.folder.delete({ where: { id: folderId } });
    await this.logFolderActivity(folder, userId, "folder.deleted");
  }

  async star(userId: string, folderId: string) {
    const folder = await this.getOwnedFolder(userId, folderId);
    await addStar("FOLDER", folder.id, folder.organizationId, userId);
  }

  async unstar(userId: string, folderId: string) {
    const folder = await this.getOwnedFolder(userId, folderId);
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
            where: { id: { in: folderIds }, organizationId: membership.organizationId },
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

import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@nextlayer/database";
import { recordAuditLog } from "../audit/audit-log.util";
import { OrganizationsService } from "../organizations/organizations.service";
import { activeShareResourceIds, getOrCreateShareLink, revokeShareLink } from "../share/share-link.util";
import { activeStarResourceIds, addStar, removeStar } from "../star/star.util";
import { StorageService } from "../storage/storage.service";
import type { CreateFolderDto } from "./dto/create-folder.dto";
import type { MoveFolderDto } from "./dto/move-folder.dto";
import type { RenameFolderDto } from "./dto/rename-folder.dto";

@Injectable()
export class FoldersService {
  constructor(
    private readonly organizations: OrganizationsService,
    private readonly storage: StorageService,
  ) {}

  async listContents(userId: string, parentId: string | undefined) {
    const membership = await this.organizations.getPrimaryMembership(userId);

    if (parentId) {
      const parent = await prisma.folder.findUnique({ where: { id: parentId } });
      if (!parent || parent.organizationId !== membership.organizationId || parent.deletedAt) {
        throw new NotFoundException("Folder not found.");
      }
    }

    const [folders, files] = await Promise.all([
      prisma.folder.findMany({
        where: { organizationId: membership.organizationId, parentId: parentId ?? null, deletedAt: null },
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

    if (dto.parentId) {
      const parent = await prisma.folder.findUnique({ where: { id: dto.parentId } });
      if (!parent || parent.organizationId !== membership.organizationId || parent.deletedAt) {
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
      if (!folder || folder.organizationId !== membership.organizationId || folder.deletedAt) {
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
  async remove(userId: string, folderId: string) {
    const folder = await this.getOwnedFolder(userId, folderId);
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

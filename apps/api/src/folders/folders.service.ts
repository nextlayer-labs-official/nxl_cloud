import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@nextlayer/database";
import { OrganizationsService } from "../organizations/organizations.service";
import { activeShareResourceIds, getOrCreateShareLink, revokeShareLink } from "../share/share-link.util";
import type { CreateFolderDto } from "./dto/create-folder.dto";

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
      folders: folders.map((f) => ({ ...f, isShared: sharedFolderIds.has(f.id) })),
      files: files.map((f) => ({ ...f, isShared: sharedFileIds.has(f.id) })),
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
      folders: folders.map((f) => ({
        id: f.id,
        name: f.name,
        parentId: f.parentId,
        createdAt: f.createdAt,
        parentName: f.parent?.name ?? "My Files",
        isShared: sharedFolderIds.has(f.id),
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

    return prisma.folder.create({
      data: {
        organizationId: membership.organizationId,
        parentId: dto.parentId ?? null,
        name: dto.name,
        createdById: userId,
      },
    });
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
    return getOrCreateShareLink("FOLDER", folder.id, userId);
  }

  async removeShareLink(userId: string, folderId: string) {
    const folder = await this.getOwnedFolder(userId, folderId);
    await revokeShareLink("FOLDER", folder.id);
  }

  async remove(userId: string, folderId: string) {
    await this.getOwnedFolder(userId, folderId);

    const [childFolderCount, fileCount] = await Promise.all([
      prisma.folder.count({ where: { parentId: folderId } }),
      prisma.file.count({ where: { folderId, deletedAt: null } }),
    ]);
    if (childFolderCount > 0 || fileCount > 0) {
      throw new BadRequestException("Folder must be empty before it can be deleted.");
    }

    await prisma.folder.delete({ where: { id: folderId } });
  }
}

import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@nextlayer/database";
import { OrganizationsService } from "../organizations/organizations.service";
import { getOrCreateShareLink, revokeShareLink } from "../share/share-link.util";
import { StorageService } from "../storage/storage.service";
import type { ConfirmUploadDto } from "./dto/confirm-upload.dto";
import type { RenameFileDto } from "./dto/rename-file.dto";
import type { RequestUploadUrlDto } from "./dto/request-upload-url.dto";

@Injectable()
export class FilesService {
  constructor(
    private readonly organizations: OrganizationsService,
    private readonly storage: StorageService,
  ) {}

  private async assertFolderInOrg(folderId: string | undefined, organizationId: string) {
    if (!folderId) return;
    const folder = await prisma.folder.findUnique({ where: { id: folderId } });
    if (!folder || folder.organizationId !== organizationId) {
      throw new NotFoundException("Folder not found.");
    }
  }

  async requestUploadUrl(userId: string, dto: RequestUploadUrlDto) {
    const membership = await this.organizations.getPrimaryMembership(userId);
    await this.assertFolderInOrg(dto.folderId, membership.organizationId);
    await this.organizations.assertWithinQuota(membership.organizationId, dto.sizeBytes);

    const storageKey = this.storage.buildKey(membership.organization.slug, dto.name);
    const uploadUrl = await this.storage.getUploadUrl(storageKey, dto.mimeType);

    return { uploadUrl, storageKey };
  }

  async confirmUpload(userId: string, dto: ConfirmUploadDto) {
    const membership = await this.organizations.getPrimaryMembership(userId);
    await this.assertFolderInOrg(dto.folderId, membership.organizationId);

    return prisma.$transaction(async (tx) => {
      const file = await tx.file.create({
        data: {
          organizationId: membership.organizationId,
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
          fileId: file.id,
          versionNumber: 1,
          storageKey: dto.storageKey,
          sizeBytes: dto.sizeBytes,
          createdById: userId,
        },
      });
      return file;
    });
  }

  private async getOwnedFile(userId: string, fileId: string) {
    const membership = await this.organizations.getPrimaryMembership(userId);
    const file = await prisma.file.findUnique({ where: { id: fileId } });
    if (!file || file.organizationId !== membership.organizationId || file.deletedAt) {
      throw new NotFoundException("File not found.");
    }
    return file;
  }

  async getDownloadUrl(userId: string, fileId: string) {
    const file = await this.getOwnedFile(userId, fileId);
    const downloadUrl = await this.storage.getDownloadUrl(file.storageKey, file.name);
    return { downloadUrl };
  }

  /** Same object, but `Content-Disposition: inline` so the browser renders it (img/iframe/etc) instead of downloading. */
  async getPreviewUrl(userId: string, fileId: string) {
    const file = await this.getOwnedFile(userId, fileId);
    const previewUrl = await this.storage.getDownloadUrl(file.storageKey, file.name, true);
    return { previewUrl };
  }

  /**
   * Soft delete only — moves the file to Trash. The Wasabi object is kept
   * until `permanentlyDelete` is called, so `restore` has something to
   * restore.
   */
  async remove(userId: string, fileId: string) {
    const file = await this.getOwnedFile(userId, fileId);
    await prisma.file.update({ where: { id: file.id }, data: { deletedAt: new Date() } });
  }

  async rename(userId: string, fileId: string, dto: RenameFileDto) {
    const file = await this.getOwnedFile(userId, fileId);
    const name = dto.name.trim();
    if (!name) throw new BadRequestException("Name can't be empty.");
    return prisma.file.update({ where: { id: file.id }, data: { name } });
  }

  private async getTrashedFile(userId: string, fileId: string) {
    const membership = await this.organizations.getPrimaryMembership(userId);
    const file = await prisma.file.findUnique({ where: { id: fileId } });
    if (!file || file.organizationId !== membership.organizationId || !file.deletedAt) {
      throw new NotFoundException("File not found in trash.");
    }
    return file;
  }

  async listTrash(userId: string) {
    const membership = await this.organizations.getPrimaryMembership(userId);
    return prisma.file.findMany({
      where: { organizationId: membership.organizationId, deletedAt: { not: null } },
      orderBy: { deletedAt: "desc" },
    });
  }

  async restore(userId: string, fileId: string) {
    const file = await this.getTrashedFile(userId, fileId);
    await prisma.file.update({ where: { id: file.id }, data: { deletedAt: null } });
  }

  async permanentlyDelete(userId: string, fileId: string) {
    const file = await this.getTrashedFile(userId, fileId);
    await this.storage.deleteObject(file.storageKey);
    await prisma.file.delete({ where: { id: file.id } });
  }

  async createShareLink(userId: string, fileId: string) {
    const file = await this.getOwnedFile(userId, fileId);
    return getOrCreateShareLink("FILE", file.id, userId);
  }

  async removeShareLink(userId: string, fileId: string) {
    const file = await this.getOwnedFile(userId, fileId);
    await revokeShareLink("FILE", file.id);
  }
}

import { GoneException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@nextlayer/database";
import { StorageService } from "../storage/storage.service";

@Injectable()
export class ShareService {
  constructor(private readonly storage: StorageService) {}

  async resolve(token: string) {
    const shareLink = await prisma.shareLink.findUnique({ where: { token } });
    if (!shareLink) {
      throw new NotFoundException("This share link doesn't exist.");
    }
    if (shareLink.revokedAt) {
      throw new GoneException("This share link has been revoked.");
    }
    if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
      throw new GoneException("This share link has expired.");
    }

    if (shareLink.resourceType === "FOLDER") {
      return this.resolveFolder(shareLink.resourceId);
    }
    return this.resolveFile(shareLink.resourceId, shareLink.allowDownload);
  }

  private async resolveFile(fileId: string, allowDownload: boolean) {
    const file = await prisma.file.findUnique({ where: { id: fileId } });
    if (!file || file.deletedAt) {
      throw new NotFoundException("This file is no longer available.");
    }

    const downloadUrl = allowDownload
      ? await this.storage.getDownloadUrl(file.storageKey, file.name)
      : null;

    return {
      type: "file" as const,
      fileName: file.name,
      sizeBytes: file.sizeBytes,
      mimeType: file.mimeType,
      downloadUrl,
    };
  }

  /** One level deep only — subfolders are listed by name, not browsable, in this MVP. */
  private async resolveFolder(folderId: string) {
    const folder = await prisma.folder.findUnique({ where: { id: folderId } });
    if (!folder) {
      throw new NotFoundException("This folder is no longer available.");
    }

    const [subfolders, files] = await Promise.all([
      prisma.folder.findMany({ where: { parentId: folder.id }, orderBy: { name: "asc" } }),
      prisma.file.findMany({
        where: { folderId: folder.id, deletedAt: null },
        orderBy: { name: "asc" },
      }),
    ]);

    const filesWithUrls = await Promise.all(
      files.map(async (file) => ({
        id: file.id,
        name: file.name,
        sizeBytes: file.sizeBytes,
        mimeType: file.mimeType,
        downloadUrl: await this.storage.getDownloadUrl(file.storageKey, file.name),
      })),
    );

    return {
      type: "folder" as const,
      folderName: folder.name,
      folders: subfolders.map((f) => ({ id: f.id, name: f.name })),
      files: filesWithUrls,
    };
  }
}

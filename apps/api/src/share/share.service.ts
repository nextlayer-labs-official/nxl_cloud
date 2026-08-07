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

    // MVP only shares files, not folders (ResourceType.FOLDER links aren't created yet).
    const file = await prisma.file.findUnique({ where: { id: shareLink.resourceId } });
    if (!file || file.deletedAt) {
      throw new NotFoundException("This file is no longer available.");
    }

    const downloadUrl = shareLink.allowDownload
      ? await this.storage.getDownloadUrl(file.storageKey, file.name)
      : null;

    return {
      fileName: file.name,
      sizeBytes: file.sizeBytes,
      mimeType: file.mimeType,
      downloadUrl,
    };
  }
}

import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { prisma } from "@nextlayer/database";
import { recordAuditLog } from "../audit/audit-log.util";
import { StorageService } from "../storage/storage.service";

const RETENTION_DAYS = 7;

/**
 * Permanently purges anything that's been sitting in Trash past the 7-day
 * retention window, every night. Runs unconditionally across every
 * organization — there's no "userId" here, this isn't a user action.
 *
 * Files and folders are purged as two independent sweeps, not a recursive
 * per-folder walk like the user-triggered permanentlyDelete methods use.
 * That's safe because of an invariant folders.service.ts's own trash logic
 * (remove()) already guarantees: trashing a folder stamps the SAME
 * deletedAt on every descendant folder/file that wasn't already trashed
 * earlier (independently, with an older timestamp) — so a descendant's
 * deletedAt is never later than its trashing ancestor's. Once a folder's
 * own deletedAt has passed the cutoff, everything under it is therefore
 * already expired too, and gets swept by the plain per-file/per-folder
 * queries below without needing to walk the tree.
 */
@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(private readonly storage: StorageService) {}

  // Nightly at 00:00 IST — the business's own timezone, so "12am" means
  // midnight there regardless of what timezone the API host itself runs in.
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { timeZone: "Asia/Kolkata" })
  async purgeExpiredTrash(): Promise<void> {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

    const filesPurged = await this.purgeExpiredFiles(cutoff);
    const foldersPurged = await this.purgeExpiredFolders(cutoff);

    if (filesPurged > 0 || foldersPurged > 0) {
      this.logger.log(`Retention sweep: purged ${filesPurged} file(s) and ${foldersPurged} folder(s) past the ${RETENTION_DAYS}-day trash window.`);
    }
  }

  private async purgeExpiredFiles(cutoff: Date): Promise<number> {
    const expired = await prisma.file.findMany({ where: { deletedAt: { lte: cutoff } } });

    for (const file of expired) {
      await this.storage.deleteObject(file.storageProvider, file.storageKey);
      // FileVersion rows cascade (onDelete: Cascade) — matches the existing
      // user-triggered permanentlyDelete, which also never cleans up old
      // versions' own storage objects; not introducing a new gap here.
      await prisma.file.delete({ where: { id: file.id } });
      await recordAuditLog({
        organizationId: file.organizationId,
        action: "file.retention_purged",
        targetType: "FILE",
        targetId: file.id,
        metadata: { name: file.name, sizeBytes: file.sizeBytes, deletedAt: file.deletedAt },
      });
    }

    return expired.length;
  }

  private async purgeExpiredFolders(cutoff: Date): Promise<number> {
    const expired = await prisma.folder.findMany({ where: { deletedAt: { lte: cutoff } } });

    for (const folder of expired) {
      try {
        // Folder.parent has onDelete: Cascade, so a still-expired descendant
        // folder elsewhere in this same batch may already be gone by the
        // time its own turn comes up — that's expected, not an error.
        await prisma.folder.delete({ where: { id: folder.id } });
      } catch {
        continue;
      }
      await recordAuditLog({
        organizationId: folder.organizationId,
        action: "folder.retention_purged",
        targetType: "FOLDER",
        targetId: folder.id,
        metadata: { name: folder.name, deletedAt: folder.deletedAt },
      });
    }

    return expired.length;
  }
}

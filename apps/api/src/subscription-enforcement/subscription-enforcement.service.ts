import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { prisma } from "@nextlayer/database";
import { recordAuditLog } from "../audit/audit-log.util";

/**
 * The one-time (per org) destructive half of the subscription gate — the
 * live blocking of uploads/edits/renames/etc. for an org that isn't
 * currently in good standing happens on every request via
 * OrganizationsService.assertOrgInGoodStanding instead; this only handles
 * revoking whatever was already shared before that point, which needs an
 * explicit sweep since nothing else touches those rows on its own.
 *
 * "Not in good standing" mirrors assertOrgInGoodStanding's own definition
 * exactly: PAST_DUE, CANCELED, or an ACTIVE/TRIALING subscription whose
 * currentPeriodEnd has already passed — covers a trial running out AND a
 * paid plan lapsing without renewal — unless an admin-set `freeUntil` comp
 * is still in the future, which always wins.
 *
 * Safe to run repeatedly: once an org's shares are gone, later runs just
 * find nothing left to revoke for it (a plain no-op), so there's no need
 * to track "already processed" separately from "still not in good
 * standing" — the query condition alone is the guard.
 */
@Injectable()
export class SubscriptionEnforcementService {
  private readonly logger = new Logger(SubscriptionEnforcementService.name);

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { timeZone: "Asia/Kolkata" })
  async revokeSharingForOrgsNotInGoodStanding(): Promise<void> {
    const now = new Date();
    const gatedOrgs = await prisma.organization.findMany({
      where: {
        subscription: {
          // Two ANDed OR-groups, not a NOT — confirmed via a real repro that
          // Prisma's NOT: { freeUntil: { gt: now } } silently excludes every
          // row where freeUntil is null (mirrors plain SQL: NOT(NULL) is
          // NULL, not TRUE, so those rows never satisfy the WHERE clause).
          // Spelling "not currently comped" as its own explicit OR sidesteps
          // that null-unsafety entirely.
          AND: [
            {
              OR: [
                { status: "PAST_DUE" },
                { status: "CANCELED" },
                { status: { in: ["ACTIVE", "TRIALING"] }, currentPeriodEnd: { lt: now } },
              ],
            },
            { OR: [{ freeUntil: null }, { freeUntil: { lte: now } }] },
          ],
        },
      },
      select: { id: true },
    });

    for (const org of gatedOrgs) {
      await this.revokeSharingForOrg(org.id);
    }
  }

  private async revokeSharingForOrg(organizationId: string): Promise<void> {
    const [files, folders] = await Promise.all([
      prisma.file.findMany({ where: { organizationId }, select: { id: true } }),
      prisma.folder.findMany({ where: { organizationId }, select: { id: true } }),
    ]);
    const fileIds = files.map((f) => f.id);
    const folderIds = folders.map((f) => f.id);
    if (fileIds.length === 0 && folderIds.length === 0) return;

    const resourceFilter = [
      ...(fileIds.length > 0 ? [{ resourceType: "FILE" as const, resourceId: { in: fileIds } }] : []),
      ...(folderIds.length > 0 ? [{ resourceType: "FOLDER" as const, resourceId: { in: folderIds } }] : []),
    ];

    const [linksRevoked, grantsRevoked] = await Promise.all([
      // Soft-revoke, same as the existing user-triggered revokeShareLink —
      // nothing new deletes the row outright.
      prisma.shareLink.updateMany({
        where: { OR: resourceFilter, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      // Permission has no soft-revoke field (revokePermission already hard-
      // deletes for the same reason) — covers both real grants and pending
      // email invites.
      prisma.permission.deleteMany({ where: { OR: resourceFilter } }),
    ]);

    if (linksRevoked.count === 0 && grantsRevoked.count === 0) return;

    this.logger.log(
      `Org ${organizationId} not in good standing: revoked ${linksRevoked.count} share link(s) and ${grantsRevoked.count} permission grant(s).`,
    );
    await recordAuditLog({
      organizationId,
      action: "organization.shares_revoked_not_in_good_standing",
      targetType: "ORGANIZATION",
      targetId: organizationId,
      metadata: { shareLinksRevoked: linksRevoked.count, permissionsRevoked: grantsRevoked.count },
    });
  }
}

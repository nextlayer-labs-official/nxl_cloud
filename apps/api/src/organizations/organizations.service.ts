import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@nextlayer/database";
import type { UpdateOrganizationDto } from "./dto/update-organization.dto";

const BYTES_PER_GB = 1024 * 1024 * 1024;

@Injectable()
export class OrganizationsService {
  /**
   * MVP simplification: a user may belong to multiple orgs (schema supports
   * it), but the portal doesn't have an org-switcher yet, so every
   * files/folders operation just operates on the user's first membership.
   */
  async getPrimaryMembership(userId: string) {
    const membership = await prisma.membership.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
      include: { organization: true },
    });
    if (!membership) {
      throw new NotFoundException("No organization found for this user.");
    }
    return membership;
  }

  /**
   * null = unlimited. Admin-set `storageLimitGbOverride` wins over the plan's
   * default — public so BillingService can check a *prospective* plan's limit
   * (e.g. "would this org's current usage fit under the plan they're
   * downgrading to?") without duplicating the override-fallback rule.
   */
  effectiveLimitBytes(
    subscription: { storageLimitGbOverride: number | null; plan: { storageLimitGb: number | null } } | null,
  ): number | null {
    const gb = subscription?.storageLimitGbOverride ?? subscription?.plan.storageLimitGb ?? null;
    return gb !== null ? gb * BYTES_PER_GB : null;
  }

  async getUsage(userId: string) {
    const membership = await this.getPrimaryMembership(userId);
    const [usage, fileCount, subscription] = await Promise.all([
      prisma.file.aggregate({
        where: { organizationId: membership.organizationId, deletedAt: null },
        _sum: { sizeBytes: true },
      }),
      prisma.file.count({
        where: { organizationId: membership.organizationId, deletedAt: null },
      }),
      prisma.subscription.findUnique({
        where: { organizationId: membership.organizationId },
        include: { plan: true },
      }),
    ]);

    return {
      usedBytes: usage._sum.sizeBytes ?? 0,
      fileCount,
      limitBytes: this.effectiveLimitBytes(subscription),
      planName: subscription?.plan.name ?? null,
    };
  }

  async updateName(userId: string, dto: UpdateOrganizationDto) {
    const membership = await this.getPrimaryMembership(userId);
    const name = dto.name.trim();
    if (!name) throw new BadRequestException("Workspace name can't be empty.");
    return prisma.organization.update({ where: { id: membership.organizationId }, data: { name } });
  }

  /** Raw current storage usage for an org, in bytes — shared by quota checks and the downgrade storage-fit gate. */
  async getUsedBytes(organizationId: string): Promise<number> {
    const usage = await prisma.file.aggregate({
      where: { organizationId, deletedAt: null },
      _sum: { sizeBytes: true },
    });
    return usage._sum.sizeBytes ?? 0;
  }

  /** Throws if uploading `additionalBytes` more would push the org over its effective storage limit. */
  async assertWithinQuota(organizationId: string, additionalBytes: number) {
    const [usedBytes, subscription] = await Promise.all([
      this.getUsedBytes(organizationId),
      prisma.subscription.findUnique({
        where: { organizationId },
        include: { plan: true },
      }),
    ]);

    const limitBytes = this.effectiveLimitBytes(subscription);
    if (limitBytes === null) return;

    if (usedBytes + additionalBytes > limitBytes) {
      const limitGb = (limitBytes / BYTES_PER_GB).toFixed(1);
      throw new BadRequestException(
        `This upload would exceed your storage limit (${limitGb} GB). Delete some files or contact support to increase your limit.`,
      );
    }
  }
}

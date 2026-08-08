import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@nextlayer/database";

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

    const storageLimitGb = subscription?.plan.storageLimitGb ?? null;
    return {
      usedBytes: usage._sum.sizeBytes ?? 0,
      fileCount,
      // null = unlimited (Business/Enterprise plans have no storageLimitGb set).
      limitBytes: storageLimitGb !== null ? storageLimitGb * 1024 * 1024 * 1024 : null,
      planName: subscription?.plan.name ?? null,
    };
  }
}

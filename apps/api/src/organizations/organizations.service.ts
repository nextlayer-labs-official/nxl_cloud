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
}

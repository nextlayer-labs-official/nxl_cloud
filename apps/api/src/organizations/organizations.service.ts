import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@nextlayer/database";
import { EmailService } from "../email/email.service";
import type { UpdateOrganizationDto } from "./dto/update-organization.dto";

const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:3000";

function toSafePartner(partner: { id: string; name: string; code: string; email: string }) {
  return { id: partner.id, name: partner.name, code: partner.code, email: partner.email };
}

function toSafeChangeRequest(
  request: { id: string; status: string; createdAt: Date; resolvedAt: Date | null },
  newPartner: { id: string; name: string; code: string; email: string } | null,
) {
  return {
    id: request.id,
    status: request.status,
    createdAt: request.createdAt,
    resolvedAt: request.resolvedAt,
    newPartner: newPartner ? toSafePartner(newPartner) : null,
  };
}

const BYTES_PER_GB = 1024 * 1024 * 1024;

@Injectable()
export class OrganizationsService {
  constructor(private readonly email: EmailService) {}

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
      // Lets the sidebar/settings show a "trial ended"/"plan ended" flag —
      // same rule assertOrgInGoodStanding enforces server-side, just
      // surfaced here for the UI instead of thrown as an error.
      inGoodStanding: this.isOrgInGoodStanding(subscription),
      subscriptionStatus: subscription?.status ?? null,
      currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
    };
  }

  /**
   * True if the org's subscription is currently active/trialing with an
   * unexpired period, or comped via an admin-set `freeUntil` that's still
   * in the future (always wins regardless of status — mirrors the same
   * exemption AdminService's MRR calculation already gives it). No
   * subscription row at all is treated as "fine" — don't block on missing
   * data. Shared by assertOrgInGoodStanding (throws) and getUsage (surfaces
   * it to the UI instead).
   */
  isOrgInGoodStanding(
    subscription: { status: string; currentPeriodEnd: Date | null; freeUntil: Date | null } | null,
  ): boolean {
    if (!subscription) return true;
    if (subscription.freeUntil && subscription.freeUntil > new Date()) return true;
    return (
      (subscription.status === "ACTIVE" || subscription.status === "TRIALING") &&
      (!subscription.currentPeriodEnd || subscription.currentPeriodEnd > new Date())
    );
  }

  async updateName(userId: string, dto: UpdateOrganizationDto) {
    const membership = await this.getPrimaryMembership(userId);
    const name = dto.name.trim();
    if (!name) throw new BadRequestException("Workspace name can't be empty.");
    return prisma.organization.update({ where: { id: membership.organizationId }, data: { name } });
  }

  /**
   * Maps this org to a partner by their code. A *first* mapping (no existing
   * partner) applies immediately — no relationship is being disturbed. But if
   * the org is already mapped to a different partner, this doesn't remap on
   * the spot: it files a PartnerChangeRequest that the CURRENT partner must
   * approve before the switch takes effect (see removePartnerCode for the
   * plain-removal equivalent).
   */
  async applyPartnerCode(userId: string, code: string) {
    const membership = await this.getPrimaryMembership(userId);
    const partner = await prisma.partner.findUnique({ where: { code: code.trim() } });
    if (!partner || partner.suspendedAt) {
      throw new NotFoundException("No partner found with that code.");
    }

    const currentPartnerId = membership.organization.partnerId;
    if (!currentPartnerId) {
      await prisma.organization.update({
        where: { id: membership.organizationId },
        data: { partnerId: partner.id },
      });
      return { status: "mapped" as const, partner: toSafePartner(partner) };
    }

    if (currentPartnerId === partner.id) {
      throw new BadRequestException("Your workspace is already mapped to this partner.");
    }

    const request = await prisma.partnerChangeRequest.upsert({
      where: { organizationId: membership.organizationId },
      create: { organizationId: membership.organizationId, currentPartnerId, newPartnerId: partner.id },
      update: { currentPartnerId, newPartnerId: partner.id, status: "PENDING", resolvedAt: null },
    });

    const currentPartner = await prisma.partner.findUnique({ where: { id: currentPartnerId } });
    if (currentPartner) {
      await this.email.sendPartnerChangeRequestEmail(
        currentPartner.email,
        membership.organization.name,
        `switch to ${partner.name}`,
        `${WEB_ORIGIN}/partner`,
      );
    }

    return { status: "pending" as const, request: toSafeChangeRequest(request, partner) };
  }

  /** Files a request to leave the current partner mapping — doesn't clear partnerId itself, that only happens once the current partner approves (see PartnerService.approveChangeRequest). */
  async removePartnerCode(userId: string) {
    const membership = await this.getPrimaryMembership(userId);
    const currentPartnerId = membership.organization.partnerId;
    if (!currentPartnerId) {
      throw new BadRequestException("Your workspace isn't mapped to a partner.");
    }

    const request = await prisma.partnerChangeRequest.upsert({
      where: { organizationId: membership.organizationId },
      create: { organizationId: membership.organizationId, currentPartnerId, newPartnerId: null },
      update: { currentPartnerId, newPartnerId: null, status: "PENDING", resolvedAt: null },
    });

    const currentPartner = await prisma.partner.findUnique({ where: { id: currentPartnerId } });
    if (currentPartner) {
      await this.email.sendPartnerChangeRequestEmail(
        currentPartner.email,
        membership.organization.name,
        "leave your partner mapping",
        `${WEB_ORIGIN}/partner`,
      );
    }

    return { status: "pending" as const, request: toSafeChangeRequest(request, null) };
  }

  /** Withdraws this org's own pending (or dismisses a resolved) change request — lets a customer back out without waiting on the partner. */
  async cancelPartnerChangeRequest(userId: string) {
    const membership = await this.getPrimaryMembership(userId);
    await prisma.partnerChangeRequest.deleteMany({ where: { organizationId: membership.organizationId } });
  }

  /** The latest leave/switch request filed for this org, if any — used by Settings to show a pending/rejected banner. */
  async getPartnerChangeRequest(userId: string) {
    const membership = await this.getPrimaryMembership(userId);
    const request = await prisma.partnerChangeRequest.findUnique({
      where: { organizationId: membership.organizationId },
    });
    if (!request) return null;
    const newPartner = request.newPartnerId
      ? await prisma.partner.findUnique({ where: { id: request.newPartnerId } })
      : null;
    return toSafeChangeRequest(request, newPartner);
  }

  /** Used by /auth/me so the portal knows immediately whether self-serve checkout should be locked. */
  async getPartner(userId: string) {
    const membership = await this.getPrimaryMembership(userId);
    if (!membership.organization.partnerId) return null;
    const partner = await prisma.partner.findUnique({ where: { id: membership.organization.partnerId } });
    return partner ? toSafePartner(partner) : null;
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

  /**
   * The live-blocking half of the subscription gate — read-only browsing/
   * download always stays open, but any mutation (upload, edit, rename,
   * move, trash, share) on a resource owned by an org that isn't currently
   * "in good standing" gets blocked here. Deliberately keyed off the
   * RESOURCE's own organizationId, not the acting user's — a shared
   * collaborator's own org being fine doesn't matter if the content they're
   * trying to edit belongs to an org that's gated, and vice versa.
   *
   * "In good standing" = ACTIVE or TRIALING with a currentPeriodEnd that
   * hasn't passed yet (a null currentPeriodEnd, e.g. a plan admins set up
   * without one, never expires on its own) — or an admin-set `freeUntil`
   * comp that's still in the future, which always wins regardless of status
   * (mirrors the same exemption AdminService's MRR calculation already
   * gives it). Everything else — an elapsed trial, a lapsed paid period
   * nobody renewed, PAST_DUE (a failed renewal payment), or CANCELED — is
   * gated the same way. Nothing here writes to `status`; it's a live,
   * computed check. See SubscriptionEnforcementService for the one-time
   * (not repeatable) side effect of this state, revoking existing shares.
   */
  async assertOrgInGoodStanding(organizationId: string): Promise<void> {
    const subscription = await prisma.subscription.findUnique({ where: { organizationId } });
    if (this.isOrgInGoodStanding(subscription)) return;

    throw new ForbiddenException(
      subscription?.status === "TRIALING"
        ? "Your trial has ended. Upgrade to a plan to continue editing, uploading, or sharing."
        : "Your plan has ended. Renew your subscription to continue editing, uploading, or sharing.",
    );
  }
}

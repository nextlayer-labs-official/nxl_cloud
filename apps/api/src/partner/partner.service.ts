import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma, type BillingCycle } from "@nextlayer/database";
import type { UpdatePartnerSubscriptionDto } from "./dto/update-partner-subscription.dto";

const DAY_MS = 24 * 60 * 60 * 1000;
const PERIOD_MS: Record<BillingCycle, number> = { MONTHLY: 30 * DAY_MS, ANNUAL: 365 * DAY_MS };
const CYCLE_DAYS: Record<BillingCycle, number> = { MONTHLY: 30, ANNUAL: 365 };
const BYTES_PER_GB = 1024 * 1024 * 1024;

/** The `tx` param type $transaction's interactive-callback form actually hands back — extracted this way since the generated client doesn't export a plain `Prisma.TransactionClient` name in this version. */
type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

@Injectable()
export class PartnerService {
  /** null = unlimited. Mirrors OrganizationsService.effectiveLimitBytes — an admin-set `storageLimitGbOverride` wins over the plan's own default. */
  private effectiveLimitBytes(
    subscription: { storageLimitGbOverride: number | null; plan: { storageLimitGb: number | null } } | null,
  ): number | null {
    const gb = subscription?.storageLimitGbOverride ?? subscription?.plan.storageLimitGb ?? null;
    return gb !== null ? gb * BYTES_PER_GB : null;
  }

  async listOrganizations(partnerId: string) {
    const orgs = await prisma.organization.findMany({
      where: { partnerId },
      include: { subscription: { include: { plan: true } } },
      orderBy: { createdAt: "desc" },
    });
    const usage = orgs.length
      ? await prisma.file.groupBy({
          by: ["organizationId"],
          where: { organizationId: { in: orgs.map((o) => o.id) }, deletedAt: null },
          _sum: { sizeBytes: true },
        })
      : [];
    const usedByOrg = new Map(usage.map((u) => [u.organizationId, u._sum.sizeBytes ?? 0]));

    return orgs.map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      createdAt: org.createdAt,
      subscription: org.subscription,
      storageUsedBytes: usedByOrg.get(org.id) ?? 0,
      // null = unlimited plan, no finite quota to compare usage against.
      storageLimitBytes: this.effectiveLimitBytes(org.subscription),
    }));
  }

  /**
   * Rolls up storage quota vs. usage across every customer mapped to this
   * partner — quota is the sum of each org's effective plan limit (an
   * admin-set override, else the plan's own storageLimitGb); orgs on an
   * unlimited plan contribute no finite quota, so they're counted
   * separately (`unlimitedCount`) rather than silently skewing the total.
   */
  async getUsageSummary(partnerId: string) {
    const orgs = await prisma.organization.findMany({
      where: { partnerId },
      select: { id: true, subscription: { include: { plan: true } } },
    });
    const usage = orgs.length
      ? await prisma.file.groupBy({
          by: ["organizationId"],
          where: { organizationId: { in: orgs.map((o) => o.id) }, deletedAt: null },
          _sum: { sizeBytes: true },
        })
      : [];
    const usedByOrg = new Map(usage.map((u) => [u.organizationId, u._sum.sizeBytes ?? 0]));

    let totalQuotaBytes = 0;
    let totalUsedBytes = 0;
    let unlimitedCount = 0;
    for (const org of orgs) {
      totalUsedBytes += usedByOrg.get(org.id) ?? 0;
      const limitBytes = this.effectiveLimitBytes(org.subscription);
      if (limitBytes === null) unlimitedCount += 1;
      else totalQuotaBytes += limitBytes;
    }

    return {
      customerCount: orgs.length,
      totalQuotaBytes,
      totalUsedBytes,
      totalFreeBytes: Math.max(0, totalQuotaBytes - totalUsedBytes),
      unlimitedCount,
    };
  }

  async listPlans() {
    return prisma.plan.findMany({ orderBy: { createdAt: "asc" } });
  }

  /** Scopes every action below to organizations actually mapped to this partner — never touchable by a different partner's session. */
  private async requireMappedOrg(partnerId: string, organizationId: string) {
    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org || org.partnerId !== partnerId) {
      throw new NotFoundException("Organization not found.");
    }
    return org;
  }

  /**
   * Mirrors BillingService.computeUpgradeProration, but against this
   * partner's own negotiated prices instead of the customer's list price —
   * the wallet balance plays the role the customer's account credit does
   * there. No discount concept here: a partner's negotiated price already
   * IS their rate.
   */
  private computeProration(
    oldPriceCents: number,
    newPriceCents: number,
    cycle: BillingCycle,
    currentPeriodEnd: Date,
  ): number {
    const totalCycleDays = CYCLE_DAYS[cycle];
    const daysRemaining = Math.max(0, Math.ceil((currentPeriodEnd.getTime() - Date.now()) / DAY_MS));
    const unusedOldValueCents = Math.round((oldPriceCents * daysRemaining) / totalCycleDays);
    const proratedNewCostCents = Math.round((newPriceCents * daysRemaining) / totalCycleDays);
    return Math.max(0, proratedNewCostCents - unusedOldValueCents);
  }

  /**
   * A mapped customer's plan change — whether it's their very first plan or
   * a later one, debiting the partner's wallet using the exact same
   * upgrade/downgrade thumb rule BillingService uses for customer self-serve
   * checkout: a mid-cycle upgrade is prorated and charged now; a mid-cycle
   * downgrade is refused outright until the current period ends; anything
   * else (first purchase, renewal, or a change made after the period
   * already lapsed) is full price for a fresh period. The wallet balance
   * (funded by admin) and per-partner pricing (also admin-set) are the only
   * gates here — there's no separate approval step.
   */
  async updateSubscription(partnerId: string, organizationId: string, dto: UpdatePartnerSubscriptionDto) {
    const org = await this.requireMappedOrg(partnerId, organizationId);
    const plan = await prisma.plan.findUnique({ where: { id: dto.planId } });
    if (!plan) throw new NotFoundException("Plan not found.");

    const existingSubscription = await prisma.subscription.findUnique({
      where: { organizationId },
      include: { plan: true },
    });
    const isPlanChange = !!existingSubscription && existingSubscription.plan.id !== plan.id;
    const hasActivePeriod =
      existingSubscription?.status === "ACTIVE" &&
      !!existingSubscription.currentPeriodEnd &&
      existingSubscription.currentPeriodEnd > new Date();
    // Every org gets the platform's default (free) plan at registration —
    // that's never something this partner actually sold, so moving a
    // customer OFF it is always a first sale at full price, not a
    // proration. Without this check, a partner's very first plan for a
    // freshly-mapped customer would get prorated against that free default
    // plan instead of charged in full.
    const isMovingOffDefaultPlan = existingSubscription?.plan.isDefault === true;

    if (isPlanChange && hasActivePeriod && !isMovingOffDefaultPlan) {
      const cycle = existingSubscription!.billingCycle;
      const [oldPrice, newPrice] = await Promise.all([
        this.resolvePartnerPrice(partnerId, existingSubscription!.plan, cycle),
        this.resolvePartnerPrice(partnerId, plan, cycle),
      ]);
      const isUpgrade = (newPrice ?? 0) > (oldPrice ?? 0);

      if (!isUpgrade) {
        const readableDate = existingSubscription!.currentPeriodEnd!.toISOString().slice(0, 10);
        throw new BadRequestException(
          `You can switch this customer to ${plan.name} once their current plan ends on ${readableDate} — downgrades take effect at renewal, not immediately.`,
        );
      }

      const netCents = this.computeProration(
        oldPrice ?? 0,
        newPrice ?? 0,
        cycle,
        existingSubscription!.currentPeriodEnd!,
      );

      return prisma.$transaction(async (tx) => {
        await this.debitWallet(tx, partnerId, netCents, {
          organizationId,
          planId: plan.id,
          note: `Upgraded ${org.name} to ${plan.name} (prorated)`,
        });
        return tx.subscription.update({
          where: { organizationId },
          data: { planId: plan.id, billingCycle: cycle, currentPeriodEnd: new Date(Date.now() + PERIOD_MS[cycle]) },
          include: { plan: true },
        });
      });
    }

    // First purchase for this org, a renewal of the same plan, or a plan
    // change made after the previous period already lapsed — full price,
    // fresh period, same as BillingService.createOrder's equivalent branch.
    const listPrice = await this.resolvePartnerPrice(partnerId, plan, dto.billingCycle);
    return prisma.$transaction(async (tx) => {
      await this.debitWallet(tx, partnerId, listPrice ?? 0, {
        organizationId,
        planId: plan.id,
        note: `Set ${org.name} to ${plan.name}`,
      });
      return tx.subscription.upsert({
        where: { organizationId },
        create: {
          organizationId,
          planId: plan.id,
          billingCycle: dto.billingCycle,
          status: "ACTIVE",
          currentPeriodEnd: new Date(Date.now() + PERIOD_MS[dto.billingCycle]),
        },
        update: {
          planId: plan.id,
          billingCycle: dto.billingCycle,
          currentPeriodEnd: new Date(Date.now() + PERIOD_MS[dto.billingCycle]),
        },
        include: { plan: true },
      });
    });
  }

  /** This partner's negotiated price per plan — plans with no override fall back to the plan's own list price. */
  async listPlanPricing(partnerId: string) {
    const [plans, prices] = await Promise.all([
      prisma.plan.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.partnerPlanPrice.findMany({ where: { partnerId } }),
    ]);
    const priceByPlanId = new Map(prices.map((p) => [p.planId, p]));
    return plans.map((plan) => {
      const override = priceByPlanId.get(plan.id);
      return {
        id: plan.id,
        name: plan.name,
        storageLimitGb: plan.storageLimitGb,
        features: plan.features,
        // What this partner is actually charged — falls back to the plan's own list price when admin hasn't set a negotiated one.
        priceMonthlyCents: override?.priceMonthlyCents ?? plan.priceMonthlyCents,
        priceYearlyCents: override?.priceYearlyCents ?? plan.priceYearlyCents,
        // The plan's normal customer-facing price, shown alongside so the partner can see their margin.
        listPriceMonthlyCents: plan.priceMonthlyCents,
        listPriceYearlyCents: plan.priceYearlyCents,
      };
    });
  }

  /** This partner's negotiated price for the plan, or the plan's list price if none was set — see PartnerPlanPrice. */
  private async resolvePartnerPrice(partnerId: string, plan: { id: string; priceMonthlyCents: number | null; priceYearlyCents: number | null }, billingCycle: "MONTHLY" | "ANNUAL") {
    const override = await prisma.partnerPlanPrice.findUnique({
      where: { partnerId_planId: { partnerId, planId: plan.id } },
    });
    if (billingCycle === "ANNUAL") return override?.priceYearlyCents ?? plan.priceYearlyCents;
    return override?.priceMonthlyCents ?? plan.priceMonthlyCents;
  }

  /**
   * Debits the wallet by `amountCents` and records the movement, atomically
   * within the caller's transaction — throws (rolling back everything else
   * in that transaction too) if the balance can't cover it. A zero/negative
   * amount is a no-op: a free plan or a fully-discounted change shouldn't
   * leave a $0 ledger entry, matching how BillingService never writes a
   * Payment row for its own zero-charge upgrade branch either.
   */
  private async debitWallet(
    tx: Tx,
    partnerId: string,
    amountCents: number,
    context: { organizationId: string; planId: string; note: string },
  ) {
    if (amountCents <= 0) return;

    const result = await tx.partner.updateMany({
      where: { id: partnerId, walletBalanceCents: { gte: amountCents } },
      data: { walletBalanceCents: { decrement: amountCents } },
    });
    if (result.count === 0) {
      const partner = await tx.partner.findUniqueOrThrow({ where: { id: partnerId } });
      const shortByCents = amountCents - partner.walletBalanceCents;
      throw new BadRequestException(
        `Insufficient wallet balance — you need ₹${(shortByCents / 100).toFixed(2)} more. Contact admin to top up your wallet.`,
      );
    }

    const updatedPartner = await tx.partner.findUniqueOrThrow({ where: { id: partnerId } });
    await tx.partnerWalletTransaction.create({
      data: {
        partnerId,
        type: "DEBIT",
        amountCents,
        balanceAfterCents: updatedPartner.walletBalanceCents,
        note: context.note,
        organizationId: context.organizationId,
        planId: context.planId,
      },
    });
  }

  /** This partner's own wallet balance + recent transaction history — read-only, only admin can credit it. */
  async getWallet(partnerId: string) {
    const [partner, transactions] = await Promise.all([
      prisma.partner.findUniqueOrThrow({ where: { id: partnerId } }),
      prisma.partnerWalletTransaction.findMany({
        where: { partnerId },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          createdBy: { select: { name: true } },
          organization: { select: { name: true } },
          plan: { select: { name: true } },
        },
      }),
    ]);
    return { balanceCents: partner.walletBalanceCents, transactions };
  }

  /** Pending requests to leave or switch away from THIS partner — the customer filed these, this partner must sign off. */
  async listChangeRequests(partnerId: string) {
    const requests = await prisma.partnerChangeRequest.findMany({
      where: { currentPartnerId: partnerId, status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        newPartner: { select: { id: true, name: true, code: true } },
      },
    });
    return requests.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      organization: r.organization,
      // null = the customer asked to leave outright; set = asked to switch straight to this other partner.
      newPartner: r.newPartner,
    }));
  }

  private async requireOwnChangeRequest(partnerId: string, requestId: string) {
    const request = await prisma.partnerChangeRequest.findUnique({ where: { id: requestId } });
    if (!request || request.currentPartnerId !== partnerId) {
      throw new NotFoundException("Request not found.");
    }
    if (request.status !== "PENDING") {
      throw new BadRequestException("This request has already been resolved.");
    }
    return request;
  }

  /** Releases (or hands off) the organization and marks the request resolved — the only way a mapping actually changes once it's no longer a first-time mapping. */
  async approveChangeRequest(partnerId: string, requestId: string) {
    const request = await this.requireOwnChangeRequest(partnerId, requestId);
    return prisma.$transaction([
      prisma.organization.update({
        where: { id: request.organizationId },
        data: { partnerId: request.newPartnerId },
      }),
      prisma.partnerChangeRequest.update({
        where: { id: request.id },
        data: { status: "APPROVED", resolvedAt: new Date() },
      }),
    ]).then(([, updatedRequest]) => updatedRequest);
  }

  /** Declines the request — the organization stays mapped to this partner. */
  async rejectChangeRequest(partnerId: string, requestId: string) {
    const request = await this.requireOwnChangeRequest(partnerId, requestId);
    return prisma.partnerChangeRequest.update({
      where: { id: request.id },
      data: { status: "REJECTED", resolvedAt: new Date() },
    });
  }
}

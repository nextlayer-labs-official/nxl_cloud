import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@nextlayer/database";
import { hashPassword } from "../auth/password.util";
import type { CreatePartnerDto } from "../admin/dto/create-partner.dto";
import type { CreditPartnerWalletDto } from "../admin/dto/credit-partner-wallet.dto";
import type { SetPartnerPlanPriceDto } from "../admin/dto/set-partner-plan-price.dto";

const BYTES_PER_GB = 1024 * 1024 * 1024;

/**
 * A distributor manages its own set of partners — the same surface an admin
 * has over partners today (`AdminService`'s "Partners (resellers)" section),
 * but every query is scoped to `distributorId`.
 */
@Injectable()
export class DistributorService {
  /** null = unlimited. Same rule as OrganizationsService/PartnerService/AdminService. */
  private effectiveLimitBytes(
    subscription: { storageLimitGbOverride: number | null; plan: { storageLimitGb: number | null } } | null,
  ): number | null {
    const gb = subscription?.storageLimitGbOverride ?? subscription?.plan.storageLimitGb ?? null;
    return gb !== null ? gb * BYTES_PER_GB : null;
  }

  /** Scopes every partner action to a partner actually onboarded by this distributor. */
  private async requireOwnPartner(distributorId: string, partnerId: string) {
    const partner = await prisma.partner.findFirst({ where: { id: partnerId, distributorId } });
    if (!partner) throw new NotFoundException("Partner not found.");
    return partner;
  }

  async getWallet(distributorId: string) {
    const [distributor, transactions] = await Promise.all([
      prisma.distributor.findUniqueOrThrow({ where: { id: distributorId } }),
      prisma.distributorWalletTransaction.findMany({
        where: { distributorId },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          createdByAdmin: { select: { name: true } },
          partner: { select: { name: true } },
          organization: { select: { name: true, customerNumber: true } },
          plan: { select: { name: true } },
        },
      }),
    ]);
    return { balanceCents: distributor.walletBalanceCents, creditEnabled: distributor.creditEnabled, transactions };
  }

  /** This distributor's own admin-set per-plan rates, alongside the plan list price for margin reference. */
  async listPlanPricing(distributorId: string) {
    const [plans, prices] = await Promise.all([
      prisma.plan.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.distributorPlanPrice.findMany({ where: { distributorId } }),
    ]);
    const priceByPlanId = new Map(prices.map((p) => [p.planId, p]));
    return plans.map((plan) => {
      const override = priceByPlanId.get(plan.id);
      return {
        id: plan.id,
        name: plan.name,
        storageLimitGb: plan.storageLimitGb,
        features: plan.features,
        // What this distributor is charged for the plan — falls back to the plan's own list price.
        priceMonthlyCents: override?.priceMonthlyCents ?? plan.priceMonthlyCents,
        priceYearlyCents: override?.priceYearlyCents ?? plan.priceYearlyCents,
        listPriceMonthlyCents: plan.priceMonthlyCents,
        listPriceYearlyCents: plan.priceYearlyCents,
      };
    });
  }

  async listPartners(distributorId: string) {
    const partners = await prisma.partner.findMany({
      where: { distributorId },
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { organizations: true } } },
    });
    return partners.map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      code: p.code,
      suspendedAt: p.suspendedAt,
      createdAt: p.createdAt,
      organizationCount: p._count.organizations,
      walletBalanceCents: p.walletBalanceCents,
    }));
  }

  async createPartner(distributorId: string, dto: CreatePartnerDto) {
    const email = dto.email.toLowerCase().trim();
    const code = dto.code.trim();
    const [existingEmail, existingCode] = await Promise.all([
      prisma.partner.findUnique({ where: { email } }),
      prisma.partner.findUnique({ where: { code } }),
    ]);
    if (existingEmail) throw new ConflictException("A partner with this email already exists.");
    if (existingCode) throw new ConflictException("That partner code is already taken.");

    const passwordHash = await hashPassword(dto.password);
    const partner = await prisma.partner.create({
      data: { name: dto.name, email, code, passwordHash, distributorId },
    });
    return { id: partner.id, name: partner.name, email: partner.email, code: partner.code };
  }

  async getPartner(distributorId: string, partnerId: string) {
    const partner = await this.requireOwnPartner(distributorId, partnerId);
    const organizations = await prisma.organization.findMany({
      where: { partnerId },
      include: { subscription: { include: { plan: true } } },
      orderBy: { createdAt: "desc" },
    });
    const usage = organizations.length
      ? await prisma.file.groupBy({
          by: ["organizationId"],
          where: { organizationId: { in: organizations.map((o) => o.id) }, deletedAt: null },
          _sum: { sizeBytes: true },
        })
      : [];
    const usedByOrg = new Map(usage.map((u) => [u.organizationId, u._sum.sizeBytes ?? 0]));

    return {
      id: partner.id,
      name: partner.name,
      email: partner.email,
      code: partner.code,
      suspendedAt: partner.suspendedAt,
      createdAt: partner.createdAt,
      walletBalanceCents: partner.walletBalanceCents,
      organizations: organizations.map((org) => ({
        id: org.id,
        customerNumber: org.customerNumber,
        name: org.name,
        slug: org.slug,
        subscription: org.subscription,
        storageUsedBytes: usedByOrg.get(org.id) ?? 0,
        storageLimitBytes: this.effectiveLimitBytes(org.subscription),
      })),
    };
  }

  async suspendPartner(distributorId: string, partnerId: string) {
    await this.requireOwnPartner(distributorId, partnerId);
    return prisma.partner.update({ where: { id: partnerId }, data: { suspendedAt: new Date() } });
  }

  async reactivatePartner(distributorId: string, partnerId: string) {
    await this.requireOwnPartner(distributorId, partnerId);
    return prisma.partner.update({ where: { id: partnerId }, data: { suspendedAt: null } });
  }

  async getPartnerUsageSummary(distributorId: string, partnerId: string) {
    await this.requireOwnPartner(distributorId, partnerId);
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

  /**
   * Every plan with: this partner's price (null = unset), the distributor's
   * own rate for the plan (what an unset partner price falls back to), and
   * the plan list price (the final fallback). Mirrors
   * `AdminService.getPartnerPricing` with the extra distributor-rate column
   * so the distributor can see their margin.
   */
  async getPartnerPricing(distributorId: string, partnerId: string) {
    await this.requireOwnPartner(distributorId, partnerId);
    const [plans, partnerPrices, distributorPrices] = await Promise.all([
      prisma.plan.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.partnerPlanPrice.findMany({ where: { partnerId } }),
      prisma.distributorPlanPrice.findMany({ where: { distributorId } }),
    ]);
    const partnerByPlanId = new Map(partnerPrices.map((p) => [p.planId, p]));
    const distributorByPlanId = new Map(distributorPrices.map((p) => [p.planId, p]));
    return plans.map((plan) => {
      const partnerOverride = partnerByPlanId.get(plan.id);
      const distributorOverride = distributorByPlanId.get(plan.id);
      return {
        planId: plan.id,
        planName: plan.name,
        listPriceMonthlyCents: plan.priceMonthlyCents,
        listPriceYearlyCents: plan.priceYearlyCents,
        distributorPriceMonthlyCents: distributorOverride?.priceMonthlyCents ?? plan.priceMonthlyCents,
        distributorPriceYearlyCents: distributorOverride?.priceYearlyCents ?? plan.priceYearlyCents,
        partnerPriceMonthlyCents: partnerOverride?.priceMonthlyCents ?? null,
        partnerPriceYearlyCents: partnerOverride?.priceYearlyCents ?? null,
      };
    });
  }

  /** Both fields null/omitted clears the partner override — it then falls back to the distributor rate. */
  async setPartnerPlanPrice(distributorId: string, partnerId: string, planId: string, dto: SetPartnerPlanPriceDto) {
    await this.requireOwnPartner(distributorId, partnerId);
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException("Plan not found.");

    if (dto.priceMonthlyCents == null && dto.priceYearlyCents == null) {
      await prisma.partnerPlanPrice.deleteMany({ where: { partnerId, planId } });
      return { planId, partnerPriceMonthlyCents: null, partnerPriceYearlyCents: null };
    }

    const saved = await prisma.partnerPlanPrice.upsert({
      where: { partnerId_planId: { partnerId, planId } },
      create: {
        partnerId,
        planId,
        priceMonthlyCents: dto.priceMonthlyCents ?? null,
        priceYearlyCents: dto.priceYearlyCents ?? null,
      },
      update: {
        priceMonthlyCents: dto.priceMonthlyCents ?? null,
        priceYearlyCents: dto.priceYearlyCents ?? null,
      },
    });
    return {
      planId,
      partnerPriceMonthlyCents: saved.priceMonthlyCents,
      partnerPriceYearlyCents: saved.priceYearlyCents,
    };
  }

  async getPartnerWallet(distributorId: string, partnerId: string) {
    const partner = await this.requireOwnPartner(distributorId, partnerId);
    const transactions = await prisma.partnerWalletTransaction.findMany({
      where: { partnerId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        createdBy: { select: { name: true } },
        organization: { select: { name: true, customerNumber: true } },
        plan: { select: { name: true } },
      },
    });
    return { balanceCents: partner.walletBalanceCents, transactions };
  }

  /**
   * Credits one of this distributor's partners' wallets — a manual top-up
   * against payment the distributor collected from the partner off-platform
   * (`note` carries the bank ref / cheque number). Does NOT touch the
   * distributor's own wallet; it's a plain increment on the partner's
   * balance, exactly like AdminService.creditPartnerWallet. Not gated by
   * `creditEnabled` — that flag only governs whether the distributor's own
   * wallet may go negative, which this action doesn't affect.
   */
  async creditPartnerWallet(distributorId: string, partnerId: string, dto: CreditPartnerWalletDto) {
    await this.requireOwnPartner(distributorId, partnerId);
    const distributor = await prisma.distributor.findUniqueOrThrow({ where: { id: distributorId } });

    return prisma.$transaction(async (tx) => {
      const partnerAfter = await tx.partner.update({
        where: { id: partnerId },
        data: { walletBalanceCents: { increment: dto.amountCents } },
      });
      await tx.partnerWalletTransaction.create({
        data: {
          partnerId,
          type: "CREDIT",
          amountCents: dto.amountCents,
          balanceAfterCents: partnerAfter.walletBalanceCents,
          note: dto.note?.trim() || `Credited by ${distributor.name}`,
        },
      });
      return { walletBalanceCents: partnerAfter.walletBalanceCents };
    });
  }
}

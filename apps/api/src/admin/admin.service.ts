import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma, type BillingCycle } from "@nextlayer/database";
import { hashPassword } from "../auth/password.util";
import { sendVerificationEmailFor } from "../auth/verification-token.util";
import { EmailService } from "../email/email.service";
import { uniqueOrgSlug } from "../organizations/slug.util";
import type { ChangePlanDto } from "./dto/change-plan.dto";
import type { CreateCustomerDto } from "./dto/create-customer.dto";
import type { CreatePartnerDto } from "./dto/create-partner.dto";
import type { CreatePlanDto } from "./dto/create-plan.dto";
import type { CreditPartnerWalletDto } from "./dto/credit-partner-wallet.dto";
import type { SetPartnerPlanPriceDto } from "./dto/set-partner-plan-price.dto";
import type { UpdatePlanDto } from "./dto/update-plan.dto";
import type { UpdateSubscriptionDto } from "./dto/update-subscription.dto";

const DAY_MS = 24 * 60 * 60 * 1000;
// A plan with trials disabled starts subscriptions ACTIVE for a normal
// monthly period instead — mirrors AuthService.register exactly, since an
// admin-created account should behave identically to a real self-serve signup.
const MONTHLY_PERIOD_MS = 30 * DAY_MS;
const PERIOD_MS: Record<BillingCycle, number> = { MONTHLY: MONTHLY_PERIOD_MS, ANNUAL: 365 * DAY_MS };
const BYTES_PER_GB = 1024 * 1024 * 1024;

@Injectable()
export class AdminService {
  constructor(private readonly email: EmailService) {}

  async createCustomer(dto: CreateCustomerDto) {
    const email = dto.email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException("An account with this email already exists.");
    }

    const passwordHash = await hashPassword(dto.password);
    const workspaceName = dto.company?.trim() || `${dto.name}'s Workspace`;
    const slug = await uniqueOrgSlug(workspaceName);
    // Not looked up by name — see Plan.isDefault's schema comment for why.
    const defaultPlan =
      (await prisma.plan.findFirst({ where: { isDefault: true } })) ??
      (await prisma.plan.findFirst({ orderBy: { createdAt: "asc" } }));

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { name: dto.name, email, passwordHash } });
      const organization = await tx.organization.create({ data: { name: workspaceName, slug } });
      await tx.membership.create({
        data: { userId: user.id, organizationId: organization.id, role: "OWNER" },
      });
      if (defaultPlan) {
        await tx.subscription.create({
          data: {
            organizationId: organization.id,
            planId: defaultPlan.id,
            status: defaultPlan.trialEnabled ? "TRIALING" : "ACTIVE",
            billingCycle: "MONTHLY",
            currentPeriodEnd: new Date(
              Date.now() + (defaultPlan.trialEnabled ? defaultPlan.trialDays * DAY_MS : MONTHLY_PERIOD_MS),
            ),
          },
        });
      }
      return { id: organization.id, name: organization.name, slug: organization.slug };
    });
  }

  async listOrganizations() {
    const [organizations, storageUsage] = await Promise.all([
      prisma.organization.findMany({
        include: {
          memberships: {
            where: { role: "OWNER" },
            take: 1,
            include: { user: true },
          },
          subscription: { include: { plan: true } },
          partner: { select: { id: true, name: true, code: true } },
          _count: { select: { memberships: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.file.groupBy({
        by: ["organizationId"],
        where: { deletedAt: null },
        _sum: { sizeBytes: true },
      }),
    ]);

    const usageByOrg = new Map(storageUsage.map((u) => [u.organizationId, u._sum.sizeBytes ?? 0]));

    return organizations.map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      createdAt: org.createdAt,
      suspendedAt: org.suspendedAt,
      memberCount: org._count.memberships,
      owner: org.memberships[0]
        ? { name: org.memberships[0].user.name, email: org.memberships[0].user.email }
        : null,
      plan: org.subscription?.plan.name ?? null,
      subscriptionStatus: org.subscription?.status ?? null,
      billingCycle: org.subscription?.billingCycle ?? null,
      currentPeriodEnd: org.subscription?.currentPeriodEnd ?? null,
      discountPercent: org.subscription?.discountPercent ?? null,
      freeUntil: org.subscription?.freeUntil ?? null,
      storageLimitGbOverride: org.subscription?.storageLimitGbOverride ?? null,
      planStorageLimitGb: org.subscription?.plan.storageLimitGb ?? null,
      creditBalanceCents: org.subscription?.creditBalanceCents ?? 0,
      storageUsedBytes: usageByOrg.get(org.id) ?? 0,
      partner: org.partner,
    }));
  }

  private async requireOrganization(id: string) {
    const organization = await prisma.organization.findUnique({ where: { id } });
    if (!organization) throw new NotFoundException("Organization not found.");
    return organization;
  }

  /** This org's own (non-deleted) file/folder ids — the basis for storage usage, item counts, and telling "shared by us" apart from "shared into us" below. */
  private async getOrgResourceIds(organizationId: string) {
    const [files, folders] = await Promise.all([
      prisma.file.findMany({ where: { organizationId, deletedAt: null }, select: { id: true } }),
      prisma.folder.findMany({ where: { organizationId, deletedAt: null }, select: { id: true } }),
    ]);
    return { fileIds: files.map((f) => f.id), folderIds: folders.map((f) => f.id) };
  }

  async getOrganization(id: string) {
    const [organization, storageUsage, trashUsage] = await Promise.all([
      prisma.organization.findUnique({
        where: { id },
        include: {
          memberships: { include: { user: true }, orderBy: { createdAt: "asc" } },
          subscription: { include: { plan: true } },
          partner: { select: { id: true, name: true, code: true, email: true } },
        },
      }),
      prisma.file.aggregate({
        where: { organizationId: id, deletedAt: null },
        _sum: { sizeBytes: true },
      }),
      // Soft-deleted files still sit in S3 (and still cost us) until permanently
      // purged from this org's trash — see AdminService.getOverview's own comment.
      prisma.file.aggregate({
        where: { organizationId: id, deletedAt: { not: null } },
        _sum: { sizeBytes: true },
      }),
    ]);
    if (!organization) throw new NotFoundException("Organization not found.");

    const { fileIds, folderIds } = await this.getOrgResourceIds(id);
    const memberIds = organization.memberships.map((m) => m.userId);

    const [grantsOnOwnResources, grantsToOwnMembers, pendingRequests] = await Promise.all([
      // Permission grants other people hold on something this org owns — "shared by us".
      prisma.permission.findMany({
        where: {
          OR: [
            { resourceType: "FILE", resourceId: { in: fileIds } },
            { resourceType: "FOLDER", resourceId: { in: folderIds } },
          ],
        },
        select: { resourceType: true, resourceId: true },
      }),
      // Permission grants held by this org's own members — some point at resources
      // this org owns (self-shares between teammates), filtered out below to leave
      // only genuinely external resources — "shared into us".
      prisma.permission.findMany({
        where: { granteeType: "USER", granteeId: { in: memberIds } },
        select: { resourceType: true, resourceId: true },
      }),
      prisma.accessRequest.findMany({
        where: {
          status: "PENDING",
          OR: [
            { resourceType: "FILE", resourceId: { in: fileIds } },
            { resourceType: "FOLDER", resourceId: { in: folderIds } },
          ],
        },
        orderBy: { createdAt: "desc" },
        include: { requestedBy: { select: { id: true, name: true, email: true } } },
      }),
    ]);

    const ownFileIdSet = new Set(fileIds);
    const ownFolderIdSet = new Set(folderIds);
    const externalGrants = grantsToOwnMembers.filter((g) =>
      g.resourceType === "FILE" ? !ownFileIdSet.has(g.resourceId) : !ownFolderIdSet.has(g.resourceId),
    );

    const sharedByOrgCount = new Set(grantsOnOwnResources.map((g) => `${g.resourceType}:${g.resourceId}`)).size;
    const sharedIntoOrgCount = new Set(externalGrants.map((g) => `${g.resourceType}:${g.resourceId}`)).size;

    const requestResourceNames = await this.resolveResourceNames(
      pendingRequests.map((r) => ({ resourceType: r.resourceType, resourceId: r.resourceId })),
    );

    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      createdAt: organization.createdAt,
      suspendedAt: organization.suspendedAt,
      storageUsedBytes: storageUsage._sum.sizeBytes ?? 0,
      storageTrashedBytes: trashUsage._sum.sizeBytes ?? 0,
      fileCount: fileIds.length,
      folderCount: folderIds.length,
      sharedByOrgCount,
      sharedIntoOrgCount,
      partner: organization.partner,
      members: organization.memberships.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        joinedAt: m.createdAt,
        emailVerifiedAt: m.user.emailVerifiedAt,
      })),
      pendingAccessRequests: pendingRequests.map((r) => ({
        id: r.id,
        resourceType: r.resourceType,
        resourceName: requestResourceNames.get(`${r.resourceType}:${r.resourceId}`) ?? "(deleted)",
        message: r.message,
        createdAt: r.createdAt,
        requestedBy: r.requestedBy,
      })),
      subscription: organization.subscription
        ? {
            id: organization.subscription.id,
            status: organization.subscription.status,
            billingCycle: organization.subscription.billingCycle,
            currentPeriodEnd: organization.subscription.currentPeriodEnd,
            discountPercent: organization.subscription.discountPercent,
            freeUntil: organization.subscription.freeUntil,
            storageLimitGbOverride: organization.subscription.storageLimitGbOverride,
            creditBalanceCents: organization.subscription.creditBalanceCents,
            plan: organization.subscription.plan,
          }
        : null,
    };
  }

  private async resolveResourceNames(resources: { resourceType: string; resourceId: string }[]) {
    const fileIds = resources.filter((r) => r.resourceType === "FILE").map((r) => r.resourceId);
    const folderIds = resources.filter((r) => r.resourceType === "FOLDER").map((r) => r.resourceId);
    const [files, folders] = await Promise.all([
      fileIds.length
        ? prisma.file.findMany({ where: { id: { in: fileIds } }, select: { id: true, name: true } })
        : ([] as { id: string; name: string }[]),
      folderIds.length
        ? prisma.folder.findMany({ where: { id: { in: folderIds } }, select: { id: true, name: true } })
        : ([] as { id: string; name: string }[]),
    ]);
    const map = new Map<string, string>();
    files.forEach((f) => map.set(`FILE:${f.id}`, f.name));
    folders.forEach((f) => map.set(`FOLDER:${f.id}`, f.name));
    return map;
  }

  async getOrganizationTransactions(id: string) {
    await this.requireOrganization(id);
    return prisma.payment.findMany({
      where: { organizationId: id },
      include: { plan: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async suspendOrganization(id: string) {
    await this.requireOrganization(id);
    return prisma.organization.update({ where: { id }, data: { suspendedAt: new Date() } });
  }

  async reactivateOrganization(id: string) {
    await this.requireOrganization(id);
    return prisma.organization.update({ where: { id }, data: { suspendedAt: null } });
  }

  /** Scopes the target user to this specific org, so an admin acting on one org's detail page can't accidentally touch a member of a different org via a mismatched id. */
  private async requireMember(organizationId: string, userId: string) {
    const membership = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
      include: { user: true },
    });
    if (!membership) throw new NotFoundException("Member not found in this organization.");
    return membership.user;
  }

  /**
   * Support-side bypass of the normal email-link flow — for when a member's
   * verification email isn't arriving (spam filtering, a typo'd inbox they've
   * since proven ownership of some other way, etc). Sets emailVerifiedAt
   * directly, which is exactly what clicking the real link would have done.
   */
  async markMemberVerified(organizationId: string, userId: string) {
    const user = await this.requireMember(organizationId, userId);
    if (!user.emailVerifiedAt) {
      await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
    }
    return this.getOrganization(organizationId);
  }

  async resendMemberVerification(organizationId: string, userId: string) {
    const user = await this.requireMember(organizationId, userId);
    if (!user.emailVerifiedAt) {
      await sendVerificationEmailFor(this.email, user);
    }
    return { success: true };
  }

  async updateSubscription(id: string, dto: UpdateSubscriptionDto) {
    await this.requireOrganization(id);

    if (dto.planId) {
      const plan = await prisma.plan.findUnique({ where: { id: dto.planId } });
      if (!plan) throw new NotFoundException("Plan not found.");
    }

    const existing = await prisma.subscription.findUnique({ where: { organizationId: id } });
    if (!existing && !dto.planId) {
      throw new NotFoundException("No subscription exists yet — provide a planId to create one.");
    }

    // Deliberately update/create instead of upsert: passing `planId: undefined` in an
    // upsert's unused `create` branch confuses Prisma's checked/unchecked input
    // resolution and throws at runtime, even though that branch never executes here.
    if (existing) {
      return prisma.subscription.update({
        where: { organizationId: id },
        data: {
          ...(dto.planId && { planId: dto.planId }),
          ...(dto.status && { status: dto.status }),
          ...(dto.billingCycle && { billingCycle: dto.billingCycle }),
          ...(dto.currentPeriodEnd !== undefined && {
            currentPeriodEnd: dto.currentPeriodEnd ? new Date(dto.currentPeriodEnd) : null,
          }),
          ...(dto.discountPercent !== undefined && { discountPercent: dto.discountPercent }),
          ...(dto.freeUntil !== undefined && {
            freeUntil: dto.freeUntil ? new Date(dto.freeUntil) : null,
          }),
          ...(dto.storageLimitGbOverride !== undefined && {
            storageLimitGbOverride: dto.storageLimitGbOverride,
          }),
          ...(dto.creditBalanceCents !== undefined && { creditBalanceCents: dto.creditBalanceCents }),
        },
        include: { plan: true },
      });
    }

    return prisma.subscription.create({
      data: {
        organizationId: id,
        planId: dto.planId!,
        status: dto.status ?? "ACTIVE",
        billingCycle: dto.billingCycle ?? "MONTHLY",
        currentPeriodEnd: dto.currentPeriodEnd ? new Date(dto.currentPeriodEnd) : null,
        discountPercent: dto.discountPercent ?? null,
        freeUntil: dto.freeUntil ? new Date(dto.freeUntil) : null,
        storageLimitGbOverride: dto.storageLimitGbOverride ?? null,
        creditBalanceCents: dto.creditBalanceCents ?? 0,
      },
      include: { plan: true },
    });
  }

  /**
   * The simple, rule-following plan change — same upgrade/downgrade thumb
   * rule BillingService/PartnerService use elsewhere: a mid-cycle downgrade
   * is refused outright until the current period ends; anything else (a
   * genuine upgrade, a first assignment, a renewal, or a change made after
   * the period already lapsed) applies immediately with a fresh period. No
   * payment moves here — admin actions never charge anyone. For discounts,
   * comps, backdating, or forcing an immediate downgrade (e.g. a refund
   * case), use `updateSubscription` (the advanced override) instead.
   */
  async changePlan(id: string, dto: ChangePlanDto) {
    await this.requireOrganization(id);
    const plan = await prisma.plan.findUnique({ where: { id: dto.planId } });
    if (!plan) throw new NotFoundException("Plan not found.");

    const existing = await prisma.subscription.findUnique({
      where: { organizationId: id },
      include: { plan: true },
    });
    const isPlanChange = !!existing && existing.plan.id !== plan.id;
    const hasActivePeriod =
      existing?.status === "ACTIVE" && !!existing.currentPeriodEnd && existing.currentPeriodEnd > new Date();

    if (isPlanChange && hasActivePeriod) {
      const cycle = existing!.billingCycle;
      const oldPrice = cycle === "ANNUAL" ? existing!.plan.priceYearlyCents : existing!.plan.priceMonthlyCents;
      const newPrice = cycle === "ANNUAL" ? plan.priceYearlyCents : plan.priceMonthlyCents;
      const isUpgrade = (newPrice ?? 0) > (oldPrice ?? 0);

      if (!isUpgrade) {
        const readableDate = existing!.currentPeriodEnd!.toISOString().slice(0, 10);
        throw new BadRequestException(
          `This is a downgrade — it can only take effect once the current plan ends on ${readableDate}. Use the advanced override to force it immediately instead.`,
        );
      }
    }

    return prisma.subscription.upsert({
      where: { organizationId: id },
      create: {
        organizationId: id,
        planId: plan.id,
        billingCycle: dto.billingCycle,
        status: "ACTIVE",
        currentPeriodEnd: new Date(Date.now() + PERIOD_MS[dto.billingCycle]),
      },
      update: {
        planId: plan.id,
        billingCycle: dto.billingCycle,
        status: "ACTIVE",
        currentPeriodEnd: new Date(Date.now() + PERIOD_MS[dto.billingCycle]),
      },
      include: { plan: true },
    });
  }

  async listPlans() {
    return prisma.plan.findMany({ orderBy: { createdAt: "asc" } });
  }

  async createPlan(dto: CreatePlanDto) {
    const existing = await prisma.plan.findUnique({ where: { name: dto.name } });
    if (existing) throw new ConflictException("A plan with this name already exists.");

    return prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.plan.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
      }
      return tx.plan.create({
        data: {
          name: dto.name,
          priceMonthlyCents: dto.priceMonthlyCents ?? null,
          priceYearlyCents: dto.priceYearlyCents ?? null,
          storageLimitGb: dto.storageLimitGb ?? null,
          features: dto.features ?? [],
          isDefault: dto.isDefault ?? false,
          trialEnabled: dto.trialEnabled ?? true,
          trialDays: dto.trialDays ?? 14,
        },
      });
    });
  }

  async updatePlan(id: string, dto: UpdatePlanDto) {
    const plan = await prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException("Plan not found.");

    if (dto.name && dto.name !== plan.name) {
      const existing = await prisma.plan.findUnique({ where: { name: dto.name } });
      if (existing) throw new ConflictException("A plan with this name already exists.");
    }

    return prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.plan.updateMany({
          where: { isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }
      return tx.plan.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.priceMonthlyCents !== undefined && { priceMonthlyCents: dto.priceMonthlyCents }),
          ...(dto.priceYearlyCents !== undefined && { priceYearlyCents: dto.priceYearlyCents }),
          ...(dto.storageLimitGb !== undefined && { storageLimitGb: dto.storageLimitGb }),
          ...(dto.features !== undefined && { features: dto.features }),
          ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
          ...(dto.trialEnabled !== undefined && { trialEnabled: dto.trialEnabled }),
          ...(dto.trialDays !== undefined && { trialDays: dto.trialDays }),
        },
      });
    });
  }

  async deletePlan(id: string) {
    const plan = await prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException("Plan not found.");

    const inUse = await prisma.subscription.count({ where: { planId: id } });
    if (inUse > 0) {
      throw new ConflictException(
        `This plan is in use by ${inUse} organization${inUse === 1 ? "" : "s"} — reassign them before deleting.`,
      );
    }

    await prisma.plan.delete({ where: { id } });
  }

  /**
   * Top-line platform KPIs for the admin dashboard landing page. `estimatedMrrCents`
   * is exactly that — an estimate derived from currently-ACTIVE subscriptions' plan
   * pricing, not a guaranteed recurring charge, since billing here is one-time
   * Razorpay orders per period (see Subscription's schema comment), not auto-renewing
   * subscriptions. `realizedRevenueCents` is the real number, from actual captured Payments.
   */
  async getOverview() {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);

    const [
      totalOrganizations,
      suspendedOrganizations,
      totalUsers,
      storageAgg,
      trashAgg,
      subscriptionsByStatus,
      activeSubscriptions,
      revenueAllTimeAgg,
      revenueLast30dAgg,
      signups7d,
      signups30d,
    ] = await Promise.all([
      prisma.organization.count(),
      prisma.organization.count({ where: { suspendedAt: { not: null } } }),
      prisma.user.count(),
      prisma.file.aggregate({ where: { deletedAt: null }, _sum: { sizeBytes: true } }),
      // Soft-deleted files still sit in S3 (and still cost us) until permanently
      // purged from trash — tracked separately since it's real spend that
      // doesn't count toward any customer's active quota.
      prisma.file.aggregate({ where: { deletedAt: { not: null } }, _sum: { sizeBytes: true } }),
      prisma.subscription.groupBy({ by: ["status"], _count: true }),
      prisma.subscription.findMany({
        where: { status: "ACTIVE" },
        include: { plan: { select: { priceMonthlyCents: true, priceYearlyCents: true } } },
      }),
      prisma.payment.aggregate({ _sum: { amountCents: true } }),
      prisma.payment.aggregate({ where: { createdAt: { gte: thirtyDaysAgo } }, _sum: { amountCents: true } }),
      prisma.organization.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.organization.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    ]);

    const estimatedMrrCents = activeSubscriptions.reduce((sum, sub) => {
      if (sub.freeUntil && sub.freeUntil > now) return sum;
      const listPriceCents =
        sub.billingCycle === "ANNUAL"
          ? sub.plan.priceYearlyCents !== null
            ? Math.round(sub.plan.priceYearlyCents / 12)
            : null
          : sub.plan.priceMonthlyCents;
      if (listPriceCents === null) return sum;
      const discounted = sub.discountPercent
        ? Math.round(listPriceCents * (1 - sub.discountPercent / 100))
        : listPriceCents;
      return sum + discounted;
    }, 0);

    const statusCounts: Record<string, number> = { TRIALING: 0, ACTIVE: 0, PAST_DUE: 0, CANCELED: 0 };
    for (const row of subscriptionsByStatus) {
      statusCounts[row.status] = row._count;
    }

    return {
      organizations: {
        total: totalOrganizations,
        active: totalOrganizations - suspendedOrganizations,
        suspended: suspendedOrganizations,
      },
      totalUsers,
      totalStorageUsedBytes: storageAgg._sum.sizeBytes ?? 0,
      totalTrashedBytes: trashAgg._sum.sizeBytes ?? 0,
      subscriptionsByStatus: statusCounts,
      estimatedMrrCents,
      revenue: {
        allTimeCents: revenueAllTimeAgg._sum.amountCents ?? 0,
        last30dCents: revenueLast30dAgg._sum.amountCents ?? 0,
      },
      signups: { last7d: signups7d, last30d: signups30d },
    };
  }

  async listAuditLog(take = 50, organizationId?: string) {
    return prisma.auditLog.findMany({
      take,
      where: organizationId ? { organizationId } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        organization: { select: { name: true, slug: true } },
        actor: { select: { name: true, email: true } },
      },
    });
  }

  // --- Partners (resellers) ---

  async createPartner(dto: CreatePartnerDto) {
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
      data: { name: dto.name, email, code, passwordHash },
    });
    return { id: partner.id, name: partner.name, email: partner.email, code: partner.code };
  }

  async listPartners() {
    const partners = await prisma.partner.findMany({
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

  private async requirePartner(id: string) {
    const partner = await prisma.partner.findUnique({ where: { id } });
    if (!partner) throw new NotFoundException("Partner not found.");
    return partner;
  }

  /** null = unlimited. Mirrors OrganizationsService/PartnerService's own copy — an admin-set `storageLimitGbOverride` wins over the plan's own default. */
  private effectiveLimitBytes(
    subscription: { storageLimitGbOverride: number | null; plan: { storageLimitGb: number | null } } | null,
  ): number | null {
    const gb = subscription?.storageLimitGbOverride ?? subscription?.plan.storageLimitGb ?? null;
    return gb !== null ? gb * BYTES_PER_GB : null;
  }

  async getPartner(id: string) {
    const partner = await this.requirePartner(id);
    const organizations = await prisma.organization.findMany({
      where: { partnerId: id },
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
        name: org.name,
        slug: org.slug,
        subscription: org.subscription,
        storageUsedBytes: usedByOrg.get(org.id) ?? 0,
        storageLimitBytes: this.effectiveLimitBytes(org.subscription),
      })),
    };
  }

  async suspendPartner(id: string) {
    await this.requirePartner(id);
    return prisma.partner.update({ where: { id }, data: { suspendedAt: new Date() } });
  }

  async reactivatePartner(id: string) {
    await this.requirePartner(id);
    return prisma.partner.update({ where: { id }, data: { suspendedAt: null } });
  }

  /**
   * Rolls up storage quota vs. usage across every customer mapped to this
   * partner — quota is the sum of each org's effective plan limit (an
   * admin-set override, else the plan's own storageLimitGb); orgs on an
   * unlimited plan contribute no finite quota, so they're counted
   * separately (`unlimitedCount`) rather than silently skewing the total.
   */
  async getPartnerUsageSummary(partnerId: string) {
    await this.requirePartner(partnerId);
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

  /** Manual top-up against payment collected outside the platform — `note` carries the reference (bank txn id, cheque number, etc.). */
  async creditPartnerWallet(adminId: string, partnerId: string, dto: CreditPartnerWalletDto) {
    await this.requirePartner(partnerId);
    return prisma.$transaction(async (tx) => {
      const updated = await tx.partner.update({
        where: { id: partnerId },
        data: { walletBalanceCents: { increment: dto.amountCents } },
      });
      await tx.partnerWalletTransaction.create({
        data: {
          partnerId,
          type: "CREDIT",
          amountCents: dto.amountCents,
          balanceAfterCents: updated.walletBalanceCents,
          note: dto.note?.trim() || null,
          createdById: adminId,
        },
      });
      return { walletBalanceCents: updated.walletBalanceCents };
    });
  }

  /** Balance + recent transaction history — both admin's manual credits and the partner's own activation/change debits. */
  async getPartnerWallet(partnerId: string) {
    const partner = await this.requirePartner(partnerId);
    const transactions = await prisma.partnerWalletTransaction.findMany({
      where: { partnerId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        createdBy: { select: { name: true, email: true } },
        organization: { select: { name: true, slug: true } },
        plan: { select: { name: true } },
      },
    });
    return { balanceCents: partner.walletBalanceCents, transactions };
  }

  /** Every plan alongside this partner's negotiated price, if any — null override fields mean "uses the plan's own list price". */
  async getPartnerPricing(partnerId: string) {
    await this.requirePartner(partnerId);
    const [plans, prices] = await Promise.all([
      prisma.plan.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.partnerPlanPrice.findMany({ where: { partnerId } }),
    ]);
    const priceByPlanId = new Map(prices.map((p) => [p.planId, p]));
    return plans.map((plan) => {
      const override = priceByPlanId.get(plan.id);
      return {
        planId: plan.id,
        planName: plan.name,
        listPriceMonthlyCents: plan.priceMonthlyCents,
        listPriceYearlyCents: plan.priceYearlyCents,
        partnerPriceMonthlyCents: override?.priceMonthlyCents ?? null,
        partnerPriceYearlyCents: override?.priceYearlyCents ?? null,
      };
    });
  }

  /** Both fields null/omitted clears the override — the plan falls back to its own list price for this partner. */
  async setPartnerPlanPrice(partnerId: string, planId: string, dto: SetPartnerPlanPriceDto) {
    await this.requirePartner(partnerId);
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

}

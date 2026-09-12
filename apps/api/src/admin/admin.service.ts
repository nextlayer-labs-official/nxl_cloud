import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma, type BillingCycle } from "@nextlayer/database";
import { recordAuditLog } from "../audit/audit-log.util";
import { hashPassword } from "../auth/password.util";
import { sendVerificationEmailFor } from "../auth/verification-token.util";
import { EmailService } from "../email/email.service";
import { uniqueOrgSlug } from "../organizations/slug.util";
import { getPlatformSettings, setDefaultStorageProvider, setPaymentsEnabled } from "../platform-settings/platform-settings.util";
import { StorageService } from "../storage/storage.service";
import type { ChangePlanDto } from "./dto/change-plan.dto";
import type { CreateCustomerDto } from "./dto/create-customer.dto";
import type { CreateDistributorDto } from "./dto/create-distributor.dto";
import type { CreatePartnerDto } from "./dto/create-partner.dto";
import type { CreatePlanDto } from "./dto/create-plan.dto";
import type { CreditPartnerWalletDto } from "./dto/credit-partner-wallet.dto";
import type { SetPartnerDistributorDto } from "./dto/set-partner-distributor.dto";
import type { SetPartnerPlanPriceDto } from "./dto/set-partner-plan-price.dto";
import type { UpdatePlanDto } from "./dto/update-plan.dto";
import type { ToggleCreditEnabledDto } from "./dto/toggle-credit-enabled.dto";
import type { UpdatePlatformSettingsDto } from "./dto/update-platform-settings.dto";
import type { UpdateSubscriptionDto } from "./dto/update-subscription.dto";

const DAY_MS = 24 * 60 * 60 * 1000;
// A plan with trials disabled starts subscriptions ACTIVE for a normal
// monthly period instead — mirrors AuthService.register exactly, since an
// admin-created account should behave identically to a real self-serve signup.
const MONTHLY_PERIOD_MS = 30 * DAY_MS;
const PERIOD_MS: Record<BillingCycle, number> = { MONTHLY: MONTHLY_PERIOD_MS, ANNUAL: 365 * DAY_MS };
const BYTES_PER_GB = 1024 * 1024 * 1024;

/** The bits of `req.adminUser` needed to attribute an admin-originated audit-log row — stashed in `metadata` since AuditLog.actorId is an FK to the customer-portal User model, not AdminUser. */
interface AdminActor {
  id: string;
  name: string;
  email: string;
}

@Injectable()
export class AdminService {
  constructor(
    private readonly email: EmailService,
    private readonly storage: StorageService,
  ) {}

  async createCustomer(dto: CreateCustomerDto, adminUser: AdminActor) {
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

    const organization = await prisma.$transaction(async (tx) => {
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
      return organization;
    });

    await recordAuditLog({
      organizationId: organization.id,
      action: "organization.created",
      targetType: "ORGANIZATION",
      targetId: organization.id,
      metadata: { adminName: adminUser.name, adminEmail: adminUser.email, orgName: organization.name },
    });

    return {
      id: organization.id,
      customerNumber: organization.customerNumber,
      name: organization.name,
      slug: organization.slug,
    };
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
      customerNumber: org.customerNumber,
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
      customerNumber: organization.customerNumber,
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

  async suspendOrganization(id: string, adminUser: AdminActor) {
    const org = await this.requireOrganization(id);
    const updated = await prisma.organization.update({ where: { id }, data: { suspendedAt: new Date() } });
    await recordAuditLog({
      organizationId: id,
      action: "organization.suspended",
      targetType: "ORGANIZATION",
      targetId: id,
      metadata: { adminName: adminUser.name, adminEmail: adminUser.email, orgName: org.name },
    });
    return updated;
  }

  async reactivateOrganization(id: string, adminUser: AdminActor) {
    const org = await this.requireOrganization(id);
    const updated = await prisma.organization.update({ where: { id }, data: { suspendedAt: null } });
    await recordAuditLog({
      organizationId: id,
      action: "organization.reactivated",
      targetType: "ORGANIZATION",
      targetId: id,
      metadata: { adminName: adminUser.name, adminEmail: adminUser.email, orgName: org.name },
    });
    return updated;
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

  async updateSubscription(id: string, dto: UpdateSubscriptionDto, adminUser: AdminActor) {
    const org = await this.requireOrganization(id);

    if (dto.planId) {
      const plan = await prisma.plan.findUnique({ where: { id: dto.planId } });
      if (!plan) throw new NotFoundException("Plan not found.");
    }

    const existing = await prisma.subscription.findUnique({ where: { organizationId: id } });
    if (!existing && !dto.planId) {
      throw new NotFoundException("No subscription exists yet — provide a planId to create one.");
    }

    await recordAuditLog({
      organizationId: id,
      action: "subscription.plan_changed",
      targetType: "ORGANIZATION",
      targetId: id,
      metadata: { adminName: adminUser.name, adminEmail: adminUser.email, orgName: org.name, override: true },
    });

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
  async changePlan(id: string, dto: ChangePlanDto, adminUser: AdminActor) {
    const org = await this.requireOrganization(id);
    const plan = await prisma.plan.findUnique({ where: { id: dto.planId } });
    if (!plan) throw new NotFoundException("Plan not found.");

    const existing = await prisma.subscription.findUnique({
      where: { organizationId: id },
      include: { plan: true },
    });
    const isPlanChange = !!existing && existing.plan.id !== plan.id;
    // A billing-cycle switch on the SAME plan (e.g. monthly -> annual) is
    // also a "change" for the downgrade-blocking rule below — isPlanChange
    // alone would miss a cycle-only switch and let it bypass the block.
    const cycleChanged = !!existing && existing.billingCycle !== dto.billingCycle;
    // TRIALING counts as "mid-cycle" too — a downgrade shouldn't cut a trial
    // short just because no payment has actually been collected yet.
    const hasActivePeriod =
      (existing?.status === "ACTIVE" || existing?.status === "TRIALING") &&
      !!existing.currentPeriodEnd &&
      existing.currentPeriodEnd > new Date();

    if ((isPlanChange || cycleChanged) && hasActivePeriod) {
      const oldCycle = existing!.billingCycle;
      const oldPrice = oldCycle === "ANNUAL" ? existing!.plan.priceYearlyCents : existing!.plan.priceMonthlyCents;
      const newPrice = dto.billingCycle === "ANNUAL" ? plan.priceYearlyCents : plan.priceMonthlyCents;
      const isUpgrade = (newPrice ?? 0) > (oldPrice ?? 0);

      if (!isUpgrade) {
        const readableDate = existing!.currentPeriodEnd!.toISOString().slice(0, 10);
        throw new BadRequestException(
          `This is a downgrade — it can only take effect once the current plan ends on ${readableDate}. Use the advanced override to force it immediately instead.`,
        );
      }
    }

    const updated = await prisma.subscription.upsert({
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

    await recordAuditLog({
      organizationId: id,
      action: "subscription.plan_changed",
      targetType: "ORGANIZATION",
      targetId: id,
      metadata: { adminName: adminUser.name, adminEmail: adminUser.email, orgName: org.name, planName: plan.name },
    });

    return updated;
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

  /** Sums an ACTIVE subscription list into a monthly-equivalent total, priced at each subscription's own plan (annual halved to monthly), minus any discount, skipping ones in a free/comped period as of `asOf`. Shared by the live `estimatedMrrCents` and the approximate historical comparison in `getOverview`'s `deltas.mrr` (see that method's own comment on why the past figure is only approximate). */
  private computeMrr(
    subs: {
      billingCycle: BillingCycle;
      discountPercent: number | null;
      freeUntil: Date | null;
      plan: { priceMonthlyCents: number | null; priceYearlyCents: number | null };
    }[],
    asOf: Date,
  ): number {
    return subs.reduce((sum, sub) => {
      if (sub.freeUntil && sub.freeUntil > asOf) return sum;
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
  }

  /**
   * Total bytes broken down by file category — shared between the Overview
   * page's donut and the dedicated Storage & Usage page. "Documents" is an
   * allowlist (mimeType has no shared prefix the way image/video do);
   * "others" is whatever's left over, not a fourth query.
   */
  private async getStorageByCategory(where: { deletedAt: null } = { deletedAt: null }) {
    const [totalAgg, imagesAgg, videosAgg, documentsAgg] = await Promise.all([
      prisma.file.aggregate({ where, _sum: { sizeBytes: true } }),
      prisma.file.aggregate({ where: { ...where, mimeType: { startsWith: "image/" } }, _sum: { sizeBytes: true } }),
      prisma.file.aggregate({ where: { ...where, mimeType: { startsWith: "video/" } }, _sum: { sizeBytes: true } }),
      prisma.file.aggregate({
        where: {
          ...where,
          OR: [
            { mimeType: { startsWith: "application/pdf" } },
            { mimeType: { startsWith: "application/msword" } },
            { mimeType: { startsWith: "application/vnd.openxmlformats-officedocument" } },
            { mimeType: { startsWith: "application/vnd.ms-" } },
            { mimeType: { startsWith: "text/" } },
          ],
        },
        _sum: { sizeBytes: true },
      }),
    ]);
    const total = totalAgg._sum.sizeBytes ?? 0;
    const images = imagesAgg._sum.sizeBytes ?? 0;
    const videos = videosAgg._sum.sizeBytes ?? 0;
    const documents = documentsAgg._sum.sizeBytes ?? 0;
    return { documents, images, videos, others: Math.max(0, total - images - videos - documents) };
  }

  /** Total bytes across files that existed and weren't yet (or hadn't yet been trashed) as of `asOf` — reconstructs a past storage total from `createdAt`/`deletedAt` rather than needing a snapshot table. */
  private async storageBytesAsOf(asOf: Date): Promise<number> {
    const agg = await prisma.file.aggregate({
      where: { createdAt: { lte: asOf }, OR: [{ deletedAt: null }, { deletedAt: { gt: asOf } } as { deletedAt: { gt: Date } }] },
      _sum: { sizeBytes: true },
    });
    return agg._sum.sizeBytes ?? 0;
  }

  /**
   * Top-line platform KPIs for the admin dashboard landing page. `estimatedMrrCents`
   * is exactly that — an estimate derived from currently-ACTIVE subscriptions' plan
   * pricing, not a guaranteed recurring charge, since billing here is one-time
   * Razorpay orders per period (see Subscription's schema comment), not auto-renewing
   * subscriptions. `realizedRevenueCents` is the real number, from actual captured Payments.
   *
   * `from`/`to` (default: last 30 days) drive `deltas` — each a % change
   * between the value as of `to` and the value as of `from`. `deltas.mrr` is
   * the least exact of the four: there's no historical MRR snapshot to
   * reconstruct, so it approximates "MRR as of `from`" using subscriptions
   * that already existed by then, priced at their *current* plan rate (past
   * pricing isn't tracked either). `revenueTrend` is independent of
   * `from`/`to` — it's always the trailing 6 calendar months of *realized*
   * revenue (actual captured Payments), which needs no approximation at all.
   */
  async getOverview(from?: string, to?: string) {
    const now = new Date();
    const periodEnd = to ? new Date(to) : now;
    const periodStart = from ? new Date(from) : new Date(periodEnd.getTime() - 30 * DAY_MS);

    const [
      totalOrganizations,
      suspendedOrganizations,
      totalUsers,
      trashAgg,
      subscriptionsByStatus,
      activeSubscriptions,
      revenueAllTimeAgg,
      revenueLast30dAgg,
      signups7d,
      signups30d,
      storageByCategory,
      storageAsOfEnd,
      storageAsOfStart,
      organizationsAsOfEnd,
      organizationsAsOfStart,
      usersAsOfEnd,
      usersAsOfStart,
      subsCreatedBeforeStart,
    ] = await Promise.all([
      prisma.organization.count(),
      prisma.organization.count({ where: { suspendedAt: { not: null } } }),
      prisma.user.count(),
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
      prisma.payment.aggregate({ where: { createdAt: { gte: new Date(now.getTime() - 30 * DAY_MS) } }, _sum: { amountCents: true } }),
      prisma.organization.count({ where: { createdAt: { gte: new Date(now.getTime() - 7 * DAY_MS) } } }),
      prisma.organization.count({ where: { createdAt: { gte: new Date(now.getTime() - 30 * DAY_MS) } } }),
      this.getStorageByCategory(),
      this.storageBytesAsOf(periodEnd),
      this.storageBytesAsOf(periodStart),
      prisma.organization.count({ where: { createdAt: { lte: periodEnd } } }),
      prisma.organization.count({ where: { createdAt: { lte: periodStart } } }),
      prisma.user.count({ where: { createdAt: { lte: periodEnd } } }),
      prisma.user.count({ where: { createdAt: { lte: periodStart } } }),
      prisma.subscription.findMany({
        where: { status: "ACTIVE", createdAt: { lte: periodStart } },
        include: { plan: { select: { priceMonthlyCents: true, priceYearlyCents: true } } },
      }),
    ]);

    const estimatedMrrCents = this.computeMrr(activeSubscriptions, now);
    const mrrAsOfStart = this.computeMrr(subsCreatedBeforeStart, periodStart);

    const percentChange = (current: number, previous: number): number => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const statusCounts: Record<string, number> = { TRIALING: 0, ACTIVE: 0, PAST_DUE: 0, CANCELED: 0 };
    for (const row of subscriptionsByStatus) {
      statusCounts[row.status] = row._count;
    }

    // Trailing 6 calendar months of REALIZED revenue (real Payment rows, not
    // reconstructed MRR — see this method's own doc comment) + new-org counts
    // for the same months, for the Revenue Trend chart.
    const monthStarts = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return d;
    });
    const revenueTrend = await Promise.all(
      monthStarts.map(async (monthStart) => {
        const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
        const [revenueAgg, newOrgs] = await Promise.all([
          prisma.payment.aggregate({ where: { createdAt: { gte: monthStart, lt: monthEnd } }, _sum: { amountCents: true } }),
          prisma.organization.count({ where: { createdAt: { gte: monthStart, lt: monthEnd } } }),
        ]);
        return {
          month: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`,
          label: monthStart.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
          revenueCents: revenueAgg._sum.amountCents ?? 0,
          newOrgs,
        };
      }),
    );

    return {
      organizations: {
        total: totalOrganizations,
        active: totalOrganizations - suspendedOrganizations,
        suspended: suspendedOrganizations,
      },
      totalUsers,
      totalStorageUsedBytes: storageAsOfEnd,
      totalTrashedBytes: trashAgg._sum.sizeBytes ?? 0,
      storageByCategory,
      subscriptionsByStatus: statusCounts,
      estimatedMrrCents,
      revenue: {
        allTimeCents: revenueAllTimeAgg._sum.amountCents ?? 0,
        last30dCents: revenueLast30dAgg._sum.amountCents ?? 0,
      },
      revenueTrend,
      signups: { last7d: signups7d, last30d: signups30d },
      period: { from: periodStart.toISOString(), to: periodEnd.toISOString() },
      deltas: {
        organizations: percentChange(organizationsAsOfEnd, organizationsAsOfStart),
        users: percentChange(usersAsOfEnd, usersAsOfStart),
        storageBytes: percentChange(storageAsOfEnd, storageAsOfStart),
        mrr: percentChange(estimatedMrrCents, mrrAsOfStart),
      },
    };
  }

  /** Cross-org user directory for the admin "Users" page — a user's real detail (role, verification actions) still lives in their org's own member list, this is just a platform-wide index. */
  async listUsers(search?: string, page = 1, pageSize = 50) {
    const where = search
      ? { OR: [{ name: { contains: search } }, { email: { contains: search } }] }
      : undefined;
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          memberships: { include: { organization: { select: { id: true, name: true } } } },
        },
      }),
    ]);
    return {
      total,
      page,
      pageSize,
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        emailVerifiedAt: u.emailVerifiedAt,
        createdAt: u.createdAt,
        organizations: u.memberships.map((m) => ({
          id: m.organization.id,
          name: m.organization.name,
          role: m.role,
        })),
      })),
    };
  }

  /** Platform-wide payments/invoices listing — generalizes getOrganizationTransactions to an optional org filter for the admin "Billing & Invoices" page. */
  async listPayments(organizationId?: string, page = 1, pageSize = 50) {
    const where = organizationId ? { organizationId } : undefined;
    const [total, payments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          organization: { select: { id: true, name: true } },
          plan: { select: { name: true } },
        },
      }),
    ]);
    return { total, page, pageSize, payments };
  }

  /** Platform totals by file category (shared with the Overview donut) plus a per-org breakdown, for the admin "Storage & Usage" page. */
  async getStorageUsage() {
    const [byCategory, organizations] = await Promise.all([
      this.getStorageByCategory(),
      prisma.organization.findMany({
        select: { id: true, name: true, subscription: { include: { plan: { select: { storageLimitGb: true } } } } },
        orderBy: { name: "asc" },
      }),
    ]);

    const perOrg = await Promise.all(
      organizations.map(async (org) => {
        const agg = await prisma.file.aggregate({
          where: { organizationId: org.id, deletedAt: null },
          _sum: { sizeBytes: true },
        });
        const limitGb = org.subscription?.storageLimitGbOverride ?? org.subscription?.plan.storageLimitGb ?? null;
        return {
          id: org.id,
          name: org.name,
          usedBytes: agg._sum.sizeBytes ?? 0,
          limitBytes: limitGb !== null ? limitGb * BYTES_PER_GB : null,
        };
      }),
    );

    return { byCategory, organizations: perOrg };
  }

  /** Cross-entity search for the admin command palette — capped small per type since it's a quick-jump picker, not a full search results page. */
  async search(query: string) {
    const q = query.trim();
    if (!q) return { organizations: [], users: [], payments: [] };

    const [organizations, users, payments] = await Promise.all([
      prisma.organization.findMany({
        where: { OR: [{ name: { contains: q } }, { slug: { contains: q } }] },
        select: { id: true, name: true, slug: true },
        take: 5,
      }),
      prisma.user.findMany({
        where: { OR: [{ name: { contains: q } }, { email: { contains: q } }] },
        select: { id: true, name: true, email: true },
        take: 5,
      }),
      prisma.payment.findMany({
        where: {
          OR: [
            { razorpayOrderId: { contains: q } },
            { razorpayPaymentId: { contains: q } },
            { organization: { name: { contains: q } } },
          ],
        },
        select: {
          id: true,
          amountCents: true,
          createdAt: true,
          organization: { select: { id: true, name: true } },
        },
        take: 5,
      }),
    ]);

    return { organizations, users, payments };
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
      include: {
        _count: { select: { organizations: true } },
        distributor: { select: { id: true, name: true } },
      },
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
      // null = a direct partner (admin-managed); set = onboarded by this distributor.
      distributor: p.distributor,
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
    const partner = await prisma.partner.findUnique({
      where: { id },
      include: { distributor: { select: { id: true, name: true } } },
    });
    if (!partner) throw new NotFoundException("Partner not found.");
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
      distributor: partner.distributor,
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
  /**
   * Move a partner under a distributor (or back to direct with distributorId
   * null). Wallet balances don't move — this only changes who manages the
   * partner and, via PartnerService.resolvePartnerPrice, which rate an unset
   * per-plan price falls back to.
   */
  async setPartnerDistributor(partnerId: string, dto: SetPartnerDistributorDto) {
    await this.requirePartner(partnerId);
    const distributorId = dto.distributorId ?? null;
    if (distributorId) {
      const distributor = await prisma.distributor.findUnique({ where: { id: distributorId } });
      if (!distributor) throw new NotFoundException("Distributor not found.");
    }
    const updated = await prisma.partner.update({
      where: { id: partnerId },
      data: { distributorId },
      include: { distributor: { select: { id: true, name: true } } },
    });
    return { id: updated.id, distributor: updated.distributor };
  }

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
        organization: { select: { name: true, slug: true, customerNumber: true } },
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

  // --- Distributors ---

  private async requireDistributor(id: string) {
    const distributor = await prisma.distributor.findUnique({ where: { id } });
    if (!distributor) throw new NotFoundException("Distributor not found.");
    return distributor;
  }

  async createDistributor(dto: CreateDistributorDto) {
    const email = dto.email.toLowerCase().trim();
    const existing = await prisma.distributor.findUnique({ where: { email } });
    if (existing) throw new ConflictException("A distributor with this email already exists.");

    const passwordHash = await hashPassword(dto.password);
    const distributor = await prisma.distributor.create({ data: { name: dto.name, email, passwordHash } });
    return { id: distributor.id, name: distributor.name, email: distributor.email };
  }

  async listDistributors() {
    const distributors = await prisma.distributor.findMany({
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { partners: true } } },
    });
    return distributors.map((d) => ({
      id: d.id,
      name: d.name,
      email: d.email,
      suspendedAt: d.suspendedAt,
      creditEnabled: d.creditEnabled,
      createdAt: d.createdAt,
      partnerCount: d._count.partners,
      walletBalanceCents: d.walletBalanceCents,
    }));
  }

  async getDistributor(id: string) {
    const distributor = await this.requireDistributor(id);
    const partners = await prisma.partner.findMany({
      where: { distributorId: id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { organizations: true } } },
    });
    return {
      id: distributor.id,
      name: distributor.name,
      email: distributor.email,
      suspendedAt: distributor.suspendedAt,
      creditEnabled: distributor.creditEnabled,
      createdAt: distributor.createdAt,
      walletBalanceCents: distributor.walletBalanceCents,
      partners: partners.map((p) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        code: p.code,
        suspendedAt: p.suspendedAt,
        createdAt: p.createdAt,
        organizationCount: p._count.organizations,
        walletBalanceCents: p.walletBalanceCents,
      })),
    };
  }

  async suspendDistributor(id: string) {
    await this.requireDistributor(id);
    return prisma.distributor.update({ where: { id }, data: { suspendedAt: new Date() } });
  }

  async reactivateDistributor(id: string) {
    await this.requireDistributor(id);
    return prisma.distributor.update({ where: { id }, data: { suspendedAt: null } });
  }

  async setDistributorCreditEnabled(id: string, dto: ToggleCreditEnabledDto) {
    await this.requireDistributor(id);
    const updated = await prisma.distributor.update({ where: { id }, data: { creditEnabled: dto.creditEnabled } });
    return { creditEnabled: updated.creditEnabled };
  }

  /** Every plan alongside this distributor's admin-set rate (null = uses the plan's list price). */
  async getDistributorPricing(distributorId: string) {
    await this.requireDistributor(distributorId);
    const [plans, prices] = await Promise.all([
      prisma.plan.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.distributorPlanPrice.findMany({ where: { distributorId } }),
    ]);
    const priceByPlanId = new Map(prices.map((p) => [p.planId, p]));
    return plans.map((plan) => {
      const override = priceByPlanId.get(plan.id);
      return {
        planId: plan.id,
        planName: plan.name,
        listPriceMonthlyCents: plan.priceMonthlyCents,
        listPriceYearlyCents: plan.priceYearlyCents,
        distributorPriceMonthlyCents: override?.priceMonthlyCents ?? null,
        distributorPriceYearlyCents: override?.priceYearlyCents ?? null,
      };
    });
  }

  /** Both fields null/omitted clears the override — the distributor rate falls back to the plan list price. */
  async setDistributorPlanPrice(distributorId: string, planId: string, dto: SetPartnerPlanPriceDto) {
    await this.requireDistributor(distributorId);
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException("Plan not found.");

    if (dto.priceMonthlyCents == null && dto.priceYearlyCents == null) {
      await prisma.distributorPlanPrice.deleteMany({ where: { distributorId, planId } });
      return { planId, distributorPriceMonthlyCents: null, distributorPriceYearlyCents: null };
    }

    const saved = await prisma.distributorPlanPrice.upsert({
      where: { distributorId_planId: { distributorId, planId } },
      create: {
        distributorId,
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
      distributorPriceMonthlyCents: saved.priceMonthlyCents,
      distributorPriceYearlyCents: saved.priceYearlyCents,
    };
  }

  async getDistributorWallet(distributorId: string) {
    const distributor = await this.requireDistributor(distributorId);
    const transactions = await prisma.distributorWalletTransaction.findMany({
      where: { distributorId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        createdByAdmin: { select: { name: true, email: true } },
        partner: { select: { name: true } },
        organization: { select: { name: true, customerNumber: true } },
        plan: { select: { name: true } },
      },
    });
    return { balanceCents: distributor.walletBalanceCents, transactions };
  }

  /** Manual top-up of a distributor's wallet — the funding source for everything the distributor pushes down to its partners. */
  async creditDistributorWallet(adminId: string, distributorId: string, dto: CreditPartnerWalletDto) {
    await this.requireDistributor(distributorId);
    return prisma.$transaction(async (tx) => {
      const updated = await tx.distributor.update({
        where: { id: distributorId },
        data: { walletBalanceCents: { increment: dto.amountCents } },
      });
      await tx.distributorWalletTransaction.create({
        data: {
          distributorId,
          type: "CREDIT",
          amountCents: dto.amountCents,
          balanceAfterCents: updated.walletBalanceCents,
          note: dto.note?.trim() || null,
          createdByAdminId: adminId,
        },
      });
      return { walletBalanceCents: updated.walletBalanceCents };
    });
  }

  /** Platform-wide toggles — the Razorpay kill-switch, and which storage provider new uploads go to (see BillingService, StorageService). */
  async getSettings() {
    const settings = await getPlatformSettings();
    return {
      paymentsEnabled: settings.paymentsEnabled,
      defaultStorageProvider: settings.defaultStorageProvider,
      availableStorageProviders: this.storage.getAvailableProviderIds(),
      updatedAt: settings.updatedAt,
      updatedByName: settings.updatedBy?.name ?? null,
    };
  }

  /** Each field is independently optional — a call only touches the setting(s) it actually includes. */
  async updateSettings(adminId: string, dto: UpdatePlatformSettingsDto, adminUser: AdminActor) {
    if (dto.paymentsEnabled !== undefined) {
      await setPaymentsEnabled(dto.paymentsEnabled, adminId);
    }
    if (dto.defaultStorageProvider !== undefined) {
      const available = this.storage.getAvailableProviderIds();
      if (!available.includes(dto.defaultStorageProvider)) {
        throw new BadRequestException(
          `"${dto.defaultStorageProvider}" isn't a configured storage provider (available: ${available.join(", ")}).`,
        );
      }
      await setDefaultStorageProvider(dto.defaultStorageProvider, adminId);
    }

    await recordAuditLog({
      action: "settings.updated",
      targetType: "SETTINGS",
      metadata: { adminName: adminUser.name, adminEmail: adminUser.email, changed: Object.keys(dto) },
    });

    return this.getSettings();
  }
}

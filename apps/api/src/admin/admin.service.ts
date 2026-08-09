import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@nextlayer/database";
import { hashPassword } from "../auth/password.util";
import { uniqueOrgSlug } from "../organizations/slug.util";
import type { CreateCustomerDto } from "./dto/create-customer.dto";
import type { CreatePlanDto } from "./dto/create-plan.dto";
import type { UpdatePlanDto } from "./dto/update-plan.dto";
import type { UpdateSubscriptionDto } from "./dto/update-subscription.dto";

// Matches the FAQ's "every plan starts with a 14-day free trial" copy — same
// as a real self-serve signup (AuthService.register), since an admin-created
// account should behave identically to one the customer made themselves.
const TRIAL_LENGTH_MS = 14 * 24 * 60 * 60 * 1000;

@Injectable()
export class AdminService {
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
            status: "TRIALING",
            billingCycle: "MONTHLY",
            currentPeriodEnd: new Date(Date.now() + TRIAL_LENGTH_MS),
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
      storageUsedBytes: usageByOrg.get(org.id) ?? 0,
    }));
  }

  private async requireOrganization(id: string) {
    const organization = await prisma.organization.findUnique({ where: { id } });
    if (!organization) throw new NotFoundException("Organization not found.");
    return organization;
  }

  async getOrganization(id: string) {
    const [organization, storageUsage] = await Promise.all([
      prisma.organization.findUnique({
        where: { id },
        include: {
          memberships: { include: { user: true }, orderBy: { createdAt: "asc" } },
          subscription: { include: { plan: true } },
        },
      }),
      prisma.file.aggregate({
        where: { organizationId: id, deletedAt: null },
        _sum: { sizeBytes: true },
      }),
    ]);
    if (!organization) throw new NotFoundException("Organization not found.");

    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      createdAt: organization.createdAt,
      suspendedAt: organization.suspendedAt,
      storageUsedBytes: storageUsage._sum.sizeBytes ?? 0,
      members: organization.memberships.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        joinedAt: m.createdAt,
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
            plan: organization.subscription.plan,
          }
        : null,
    };
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
          seatLimit: dto.seatLimit ?? null,
          features: dto.features ?? [],
          isDefault: dto.isDefault ?? false,
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
          ...(dto.seatLimit !== undefined && { seatLimit: dto.seatLimit }),
          ...(dto.features !== undefined && { features: dto.features }),
          ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
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
}

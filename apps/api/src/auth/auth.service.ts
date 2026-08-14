import { randomBytes } from "node:crypto";
import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { prisma } from "@nextlayer/database";
import type { Request } from "express";
import { OrganizationsService } from "../organizations/organizations.service";
import { uniqueOrgSlug } from "../organizations/slug.util";
import { StorageService } from "../storage/storage.service";
import type { ChangePasswordDto } from "./dto/change-password.dto";
import type { DeleteAccountDto } from "./dto/delete-account.dto";
import type { LoginDto } from "./dto/login.dto";
import type { RegisterDto } from "./dto/register.dto";
import type { UpdateProfileDto } from "./dto/update-profile.dto";
import { hashPassword, verifyPassword } from "./password.util";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
// A plan with trials disabled starts subscriptions ACTIVE for a normal
// monthly period instead — matches billing.service.ts's MONTHLY period.
const MONTHLY_PERIOD_MS = 30 * DAY_MS;

function getUserAgent(req: Request): string | undefined {
  const ua = req.headers["user-agent"];
  return typeof ua === "string" ? ua : undefined;
}

function toSafeUser(user: { id: string; email: string; name: string; avatarUrl: string | null }) {
  return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly organizations: OrganizationsService,
    private readonly storage: StorageService,
  ) {}

  async register(dto: RegisterDto, req: Request) {
    const email = dto.email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException("An account with this email already exists.");
    }

    const passwordHash = await hashPassword(dto.password);

    // Solo/personal workspace by default — a company name is optional, not required.
    const workspaceName = dto.company?.trim() || `${dto.name}'s Workspace`;
    const slug = await uniqueOrgSlug(workspaceName);

    // New orgs trial whichever plan the admin has marked as default (not looked up
    // by name — plan names are renameable from the admin panel, and a name-based
    // lookup like `{ name: "Business" }` silently breaks every signup the moment
    // that plan gets renamed).
    const defaultPlan =
      (await prisma.plan.findFirst({ where: { isDefault: true } })) ??
      (await prisma.plan.findFirst({ orderBy: { createdAt: "asc" } }));

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name: dto.name, email, passwordHash },
      });
      const organization = await tx.organization.create({
        data: { name: workspaceName, slug },
      });
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
      const sessionToken = randomBytes(32).toString("hex");
      await tx.session.create({
        data: {
          userId: user.id,
          sessionToken,
          expiresAt: new Date(Date.now() + SESSION_TTL_MS),
          userAgent: getUserAgent(req),
          ipAddress: req.ip,
        },
      });
      return { user, sessionToken };
    });

    return { user: toSafeUser(result.user), sessionToken: result.sessionToken };
  }

  async login(dto: LoginDto, req: Request) {
    const email = dto.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: { orderBy: { createdAt: "asc" }, take: 1, include: { organization: true } },
      },
    });

    if (!user?.passwordHash || !(await verifyPassword(dto.password, user.passwordHash))) {
      throw new UnauthorizedException("Incorrect email or password.");
    }

    if (user.memberships[0]?.organization.suspendedAt) {
      throw new UnauthorizedException("This account has been suspended.");
    }

    const sessionToken = randomBytes(32).toString("hex");
    await prisma.session.create({
      data: {
        userId: user.id,
        sessionToken,
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
        userAgent: getUserAgent(req),
        ipAddress: req.ip,
      },
    });

    return { user: toSafeUser(user), sessionToken };
  }

  async logout(token: string | undefined) {
    if (!token) return;
    await prisma.session.deleteMany({ where: { sessionToken: token } });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const data: { name?: string; email?: string } = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) {
      const email = dto.email.toLowerCase().trim();
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== userId) {
        throw new ConflictException("An account with this email already exists.");
      }
      data.email = email;
    }
    const user = await prisma.user.update({ where: { id: userId }, data });
    return { user: toSafeUser(user) };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.passwordHash || !(await verifyPassword(dto.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException("Current password is incorrect.");
    }
    const passwordHash = await hashPassword(dto.newPassword);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }

  /**
   * Personal workspace = one user per org, so deleting the account deletes the
   * whole workspace. Order matters: collect storage keys and delete the
   * Organization (which cascades Folder/File/FileVersion/etc. in the DB) before
   * removing the Wasabi objects, then delete the User row last — by that point
   * nothing non-cascading (Folder.createdBy, File.uploadedBy, ...) still
   * references it, since those rows were org-scoped and are already gone.
   */
  async deleteAccount(userId: string, dto: DeleteAccountDto) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.passwordHash || !(await verifyPassword(dto.password, user.passwordHash))) {
      throw new UnauthorizedException("Password is incorrect.");
    }

    const membership = await this.organizations.getPrimaryMembership(userId);
    const files = await prisma.file.findMany({
      where: { organizationId: membership.organizationId },
      select: { storageKey: true },
    });

    await prisma.organization.delete({ where: { id: membership.organizationId } });
    await Promise.all(files.map((f) => this.storage.deleteObject(f.storageKey)));
    await prisma.user.delete({ where: { id: userId } });
  }
}

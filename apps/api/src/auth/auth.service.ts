import { randomBytes } from "node:crypto";
import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { prisma } from "@nextlayer/database";
import type { Request } from "express";
import type { LoginDto } from "./dto/login.dto";
import type { RegisterDto } from "./dto/register.dto";
import { hashPassword, verifyPassword } from "./password.util";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
// Matches the FAQ page's "Every plan starts with a 14-day free trial" copy.
const TRIAL_LENGTH_MS = 14 * 24 * 60 * 60 * 1000;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getUserAgent(req: Request): string | undefined {
  const ua = req.headers["user-agent"];
  return typeof ua === "string" ? ua : undefined;
}

function toSafeUser(user: { id: string; email: string; name: string; avatarUrl: string | null }) {
  return { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl };
}

@Injectable()
export class AuthService {
  async register(dto: RegisterDto, req: Request) {
    const email = dto.email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException("An account with this email already exists.");
    }

    const passwordHash = await hashPassword(dto.password);

    const baseSlug = slugify(dto.company) || "org";
    let slug = baseSlug;
    let suffix = 0;
    while (await prisma.organization.findUnique({ where: { slug } })) {
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }

    // New orgs trial the Business plan by default (matches "Start free trial"
    // on the Business tier being the marketing site's primary CTA).
    const businessPlan = await prisma.plan.findFirst({ where: { name: "Business" } });

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { name: dto.name, email, passwordHash },
      });
      const organization = await tx.organization.create({
        data: { name: dto.company, slug },
      });
      await tx.membership.create({
        data: { userId: user.id, organizationId: organization.id, role: "OWNER" },
      });
      if (businessPlan) {
        await tx.subscription.create({
          data: {
            organizationId: organization.id,
            planId: businessPlan.id,
            status: "TRIALING",
            billingCycle: "MONTHLY",
            currentPeriodEnd: new Date(Date.now() + TRIAL_LENGTH_MS),
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
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user?.passwordHash || !(await verifyPassword(dto.password, user.passwordHash))) {
      throw new UnauthorizedException("Incorrect email or password.");
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
}

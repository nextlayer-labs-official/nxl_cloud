import { randomBytes } from "node:crypto";
import { ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { prisma } from "@nextlayer/database";
import type { Request } from "express";
import { verifyPassword } from "../auth/password.util";
import type { PartnerLoginDto } from "./dto/partner-login.dto";

const PARTNER_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function getUserAgent(req: Request): string | undefined {
  const ua = req.headers["user-agent"];
  return typeof ua === "string" ? ua : undefined;
}

function toSafePartner(partner: { id: string; email: string; name: string; code: string }) {
  return { id: partner.id, email: partner.email, name: partner.name, code: partner.code };
}

@Injectable()
export class PartnerAuthService {
  async login(dto: PartnerLoginDto, req: Request) {
    const email = dto.email.toLowerCase().trim();
    const partner = await prisma.partner.findUnique({ where: { email } });

    if (!partner || !(await verifyPassword(dto.password, partner.passwordHash))) {
      throw new UnauthorizedException("Incorrect email or password.");
    }
    if (partner.suspendedAt) {
      throw new ForbiddenException("This partner account has been suspended.");
    }

    const sessionToken = randomBytes(32).toString("hex");
    await prisma.partnerSession.create({
      data: {
        partnerId: partner.id,
        sessionToken,
        expiresAt: new Date(Date.now() + PARTNER_SESSION_TTL_MS),
        userAgent: getUserAgent(req),
        ipAddress: req.ip,
      },
    });

    return { partner: toSafePartner(partner), sessionToken };
  }

  async logout(token: string | undefined) {
    if (!token) return;
    await prisma.partnerSession.deleteMany({ where: { sessionToken: token } });
  }
}

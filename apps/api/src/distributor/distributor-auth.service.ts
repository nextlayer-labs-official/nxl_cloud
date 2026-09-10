import { randomBytes } from "node:crypto";
import { ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { prisma } from "@nextlayer/database";
import type { Request } from "express";
import { verifyPassword } from "../auth/password.util";
import type { DistributorLoginDto } from "./dto/distributor-login.dto";

const DISTRIBUTOR_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function getUserAgent(req: Request): string | undefined {
  const ua = req.headers["user-agent"];
  return typeof ua === "string" ? ua : undefined;
}

function toSafeDistributor(distributor: { id: string; email: string; name: string }) {
  return { id: distributor.id, email: distributor.email, name: distributor.name };
}

@Injectable()
export class DistributorAuthService {
  async login(dto: DistributorLoginDto, req: Request) {
    const email = dto.email.toLowerCase().trim();
    const distributor = await prisma.distributor.findUnique({ where: { email } });

    if (!distributor || !(await verifyPassword(dto.password, distributor.passwordHash))) {
      throw new UnauthorizedException("Incorrect email or password.");
    }
    if (distributor.suspendedAt) {
      throw new ForbiddenException("This distributor account has been suspended.");
    }

    const sessionToken = randomBytes(32).toString("hex");
    await prisma.distributorSession.create({
      data: {
        distributorId: distributor.id,
        sessionToken,
        expiresAt: new Date(Date.now() + DISTRIBUTOR_SESSION_TTL_MS),
        userAgent: getUserAgent(req),
        ipAddress: req.ip,
      },
    });

    return { distributor: toSafeDistributor(distributor), sessionToken };
  }

  async logout(token: string | undefined) {
    if (!token) return;
    await prisma.distributorSession.deleteMany({ where: { sessionToken: token } });
  }
}

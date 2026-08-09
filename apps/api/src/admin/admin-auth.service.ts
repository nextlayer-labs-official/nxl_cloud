import { randomBytes } from "node:crypto";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { prisma } from "@nextlayer/database";
import type { Request } from "express";
import { verifyPassword } from "../auth/password.util";
import type { AdminLoginDto } from "./dto/admin-login.dto";

const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function getUserAgent(req: Request): string | undefined {
  const ua = req.headers["user-agent"];
  return typeof ua === "string" ? ua : undefined;
}

function toSafeAdminUser(adminUser: { id: string; email: string; name: string }) {
  return { id: adminUser.id, email: adminUser.email, name: adminUser.name };
}

@Injectable()
export class AdminAuthService {
  async login(dto: AdminLoginDto, req: Request) {
    const email = dto.email.toLowerCase().trim();
    const adminUser = await prisma.adminUser.findUnique({ where: { email } });

    if (!adminUser || !(await verifyPassword(dto.password, adminUser.passwordHash))) {
      throw new UnauthorizedException("Incorrect email or password.");
    }

    const sessionToken = randomBytes(32).toString("hex");
    await prisma.adminSession.create({
      data: {
        adminUserId: adminUser.id,
        sessionToken,
        expiresAt: new Date(Date.now() + ADMIN_SESSION_TTL_MS),
        userAgent: getUserAgent(req),
        ipAddress: req.ip,
      },
    });

    return { adminUser: toSafeAdminUser(adminUser), sessionToken };
  }

  async logout(token: string | undefined) {
    if (!token) return;
    await prisma.adminSession.deleteMany({ where: { sessionToken: token } });
  }
}

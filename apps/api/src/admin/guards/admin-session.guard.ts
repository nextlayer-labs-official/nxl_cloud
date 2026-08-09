import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { prisma } from "@nextlayer/database";
import type { Request } from "express";

// Deliberately distinct from SESSION_COOKIE (auth/guards/session.guard.ts) —
// admin and customer sessions never share a cookie, table, or login form.
export const ADMIN_SESSION_COOKIE = "admin_session_token";

@Injectable()
export class AdminSessionGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const token: string | undefined = req.cookies?.[ADMIN_SESSION_COOKIE];
    if (!token) {
      throw new UnauthorizedException();
    }

    const session = await prisma.adminSession.findUnique({
      where: { sessionToken: token },
      include: { adminUser: true },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException();
    }

    req.adminUser = {
      id: session.adminUser.id,
      email: session.adminUser.email,
      name: session.adminUser.name,
    };
    return true;
  }
}

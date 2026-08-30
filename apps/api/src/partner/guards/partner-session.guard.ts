import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { prisma } from "@nextlayer/database";
import type { Request } from "express";

// Deliberately distinct from SESSION_COOKIE (customer) and ADMIN_SESSION_COOKIE
// (platform staff) — a partner session never shares a cookie, table, or login
// form with either.
export const PARTNER_SESSION_COOKIE = "partner_session_token";

@Injectable()
export class PartnerSessionGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const token: string | undefined = req.cookies?.[PARTNER_SESSION_COOKIE];
    if (!token) {
      throw new UnauthorizedException();
    }

    const session = await prisma.partnerSession.findUnique({
      where: { sessionToken: token },
      include: { partner: true },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException();
    }
    if (session.partner.suspendedAt) {
      throw new ForbiddenException("This partner account has been suspended.");
    }

    req.partner = {
      id: session.partner.id,
      email: session.partner.email,
      name: session.partner.name,
      code: session.partner.code,
    };
    return true;
  }
}

import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { prisma } from "@nextlayer/database";
import type { Request } from "express";

// Its own cookie, distinct from every other session system (customer / admin /
// partner) — a distributor never shares a cookie, table, or login form.
export const DISTRIBUTOR_SESSION_COOKIE = "distributor_session_token";

@Injectable()
export class DistributorSessionGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const token: string | undefined = req.cookies?.[DISTRIBUTOR_SESSION_COOKIE];
    if (!token) {
      throw new UnauthorizedException();
    }

    const session = await prisma.distributorSession.findUnique({
      where: { sessionToken: token },
      include: { distributor: true },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException();
    }
    if (session.distributor.suspendedAt) {
      throw new ForbiddenException("This distributor account has been suspended.");
    }

    req.distributor = {
      id: session.distributor.id,
      email: session.distributor.email,
      name: session.distributor.name,
    };
    return true;
  }
}

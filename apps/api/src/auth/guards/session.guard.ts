import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { prisma } from "@nextlayer/database";
import type { Request } from "express";

export const SESSION_COOKIE = "session_token";

@Injectable()
export class SessionGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const token: string | undefined = req.cookies?.[SESSION_COOKIE];
    if (!token) {
      throw new UnauthorizedException();
    }

    const session = await prisma.session.findUnique({
      where: { sessionToken: token },
      include: {
        user: {
          include: {
            memberships: { orderBy: { createdAt: "asc" }, take: 1, include: { organization: true } },
          },
        },
      },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException();
    }

    if (session.user.memberships[0]?.organization.suspendedAt) {
      throw new UnauthorizedException("This account has been suspended.");
    }

    req.user = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      avatarUrl: session.user.avatarUrl,
      emailVerifiedAt: session.user.emailVerifiedAt,
    };
    return true;
  }
}

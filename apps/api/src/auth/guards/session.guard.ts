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
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException();
    }

    req.user = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      avatarUrl: session.user.avatarUrl,
    };
    return true;
  }
}

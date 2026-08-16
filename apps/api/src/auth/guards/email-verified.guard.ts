import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import type { Request } from "express";

/**
 * Applied per-route (not at the controller level) to mutating endpoints only
 * — read-only routes (listing, download, preview) stay open so an unverified
 * user can still see what's already there. Runs after SessionGuard, which
 * populates req.user; blocking unverified writes keeps the DB from filling
 * with content attached to accounts nobody's confirmed actually own their
 * email, which would otherwise throw off real usage/utilization numbers.
 */
@Injectable()
export class EmailVerifiedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (!req.user?.emailVerifiedAt) {
      throw new ForbiddenException("Verify your email to continue.");
    }
    return true;
  }
}

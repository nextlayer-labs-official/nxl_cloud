import { Body, Controller, Get, Headers, Post, Req, UseGuards } from "@nestjs/common";
import type { RawBodyRequest } from "@nestjs/common";
import type { Request } from "express";
import { SessionGuard } from "../auth/guards/session.guard";
import { BillingService } from "./billing.service";
import { CreateCheckoutSessionDto } from "./dto/create-checkout-session.dto";

@Controller("billing")
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get("plans")
  listPlans() {
    return this.billing.listPlans();
  }

  @Get("subscription")
  @UseGuards(SessionGuard)
  getSubscription(@Req() req: Request) {
    return this.billing.getSubscription(req.user!.id);
  }

  @Post("checkout")
  @UseGuards(SessionGuard)
  createCheckout(@Req() req: Request, @Body() dto: CreateCheckoutSessionDto) {
    return this.billing.createCheckoutSession(req.user!.id, dto);
  }

  @Post("portal")
  @UseGuards(SessionGuard)
  createPortal(@Req() req: Request) {
    return this.billing.createPortalSession(req.user!.id);
  }

  /** No SessionGuard — Stripe calls this server-to-server with no session cookie. */
  @Post("webhook")
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("stripe-signature") signature: string | undefined,
  ) {
    await this.billing.handleWebhook(req.rawBody!, signature);
    return { received: true };
  }
}

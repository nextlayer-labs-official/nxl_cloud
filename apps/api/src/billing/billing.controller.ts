import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Post, Req, UseGuards } from "@nestjs/common";
import type { RawBodyRequest } from "@nestjs/common";
import type { Request } from "express";
import { SessionGuard } from "../auth/guards/session.guard";
import { BillingService } from "./billing.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { VerifyPaymentDto } from "./dto/verify-payment.dto";

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

  @Post("order")
  @UseGuards(SessionGuard)
  createOrder(@Req() req: Request, @Body() dto: CreateOrderDto) {
    return this.billing.createOrder(req.user!.id, dto);
  }

  @Post("verify")
  @UseGuards(SessionGuard)
  verifyPayment(@Req() req: Request, @Body() dto: VerifyPaymentDto) {
    return this.billing.verifyPayment(req.user!.id, dto);
  }

  @Get("transactions")
  @UseGuards(SessionGuard)
  listTransactions(@Req() req: Request) {
    return this.billing.listTransactions(req.user!.id);
  }

  @Post("cancel-pending-change")
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionGuard)
  async cancelPendingChange(@Req() req: Request) {
    await this.billing.cancelPendingChange(req.user!.id);
    return { success: true };
  }

  /** No SessionGuard — Razorpay calls this server-to-server with no session cookie. */
  @Post("webhook")
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("x-razorpay-signature") signature: string | undefined,
  ) {
    await this.billing.handleWebhook(req.rawBody!, signature);
    return { received: true };
  }
}

import { randomBytes } from "node:crypto";
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { prisma, type BillingCycle } from "@nextlayer/database";
import Razorpay from "razorpay";
import { validatePaymentVerification, validateWebhookSignature } from "razorpay/dist/utils/razorpay-utils";
import { OrganizationsService } from "../organizations/organizations.service";
import type { CreateOrderDto } from "./dto/create-order.dto";
import type { VerifyPaymentDto } from "./dto/verify-payment.dto";

const PERIOD_MS: Record<BillingCycle, number> = {
  MONTHLY: 30 * 24 * 60 * 60 * 1000,
  ANNUAL: 365 * 24 * 60 * 60 * 1000,
};

interface OrderNotes {
  organizationId?: string;
  planId?: string;
  billingCycle?: string;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly razorpay: Razorpay | null;
  private readonly keyId: string | undefined;

  constructor(private readonly organizations: OrganizationsService) {
    this.keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    this.razorpay =
      this.keyId && keySecret ? new Razorpay({ key_id: this.keyId, key_secret: keySecret }) : null;
  }

  private requireRazorpay(): Razorpay {
    if (!this.razorpay) {
      throw new ServiceUnavailableException(
        "Billing isn't configured yet — add RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET to enable it.",
      );
    }
    return this.razorpay;
  }

  async listPlans() {
    const plans = await prisma.plan.findMany();
    // MySQL sorts NULL first on ASC — sort in JS instead so "Custom" pricing (null) lands last.
    return plans.sort(
      (a, b) => (a.priceMonthlyCents ?? Infinity) - (b.priceMonthlyCents ?? Infinity),
    );
  }

  async getSubscription(userId: string) {
    const membership = await this.organizations.getPrimaryMembership(userId);
    return prisma.subscription.findUnique({
      where: { organizationId: membership.organizationId },
      include: { plan: true },
    });
  }

  async createOrder(userId: string, dto: CreateOrderDto) {
    const razorpay = this.requireRazorpay();
    const membership = await this.organizations.getPrimaryMembership(userId);

    const plan = await prisma.plan.findUnique({ where: { id: dto.planId } });
    if (!plan) throw new NotFoundException("Plan not found.");

    const listPrice = dto.billingCycle === "ANNUAL" ? plan.priceYearlyCents : plan.priceMonthlyCents;
    if (!listPrice) {
      throw new BadRequestException("This plan isn't available for self-serve checkout.");
    }

    // An admin-set discount is prospective — it applies the next time the org actually
    // checks out (here), not retroactively to whatever they already paid for their
    // current period. This is the only place it's actually charged; it's cosmetic
    // everywhere else in the UI.
    const existingSubscription = await prisma.subscription.findUnique({
      where: { organizationId: membership.organizationId },
    });
    const amount = existingSubscription?.discountPercent
      ? Math.round((listPrice * (100 - existingSubscription.discountPercent)) / 100)
      : listPrice;

    // Razorpay caps `receipt` at 40 chars — org/plan context lives in `notes` instead,
    // this is just a short unique reference.
    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: randomBytes(10).toString("hex"),
      notes: {
        organizationId: membership.organizationId,
        planId: plan.id,
        billingCycle: dto.billingCycle,
      },
    });

    return { orderId: order.id, amount: order.amount, currency: order.currency, keyId: this.keyId };
  }

  async verifyPayment(userId: string, dto: VerifyPaymentDto) {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      throw new ServiceUnavailableException("Billing isn't configured yet.");
    }

    const valid = validatePaymentVerification(
      { order_id: dto.razorpayOrderId, payment_id: dto.razorpayPaymentId },
      dto.razorpaySignature,
      keySecret,
    );
    if (!valid) {
      throw new BadRequestException("Payment verification failed.");
    }

    const razorpay = this.requireRazorpay();
    const order = await razorpay.orders.fetch(dto.razorpayOrderId);
    const notes = order.notes as OrderNotes;

    const membership = await this.organizations.getPrimaryMembership(userId);
    if (!notes.organizationId || notes.organizationId !== membership.organizationId) {
      throw new BadRequestException("This order doesn't belong to your organization.");
    }
    if (!notes.planId) {
      throw new BadRequestException("This order is missing plan information.");
    }

    await this.activateSubscription(
      notes.organizationId,
      notes.planId,
      (notes.billingCycle as BillingCycle) ?? "MONTHLY",
      dto.razorpayOrderId,
      dto.razorpayPaymentId,
    );

    return prisma.subscription.findUnique({
      where: { organizationId: notes.organizationId },
      include: { plan: true },
    });
  }

  private async activateSubscription(
    organizationId: string,
    planId: string,
    billingCycle: BillingCycle,
    razorpayOrderId: string,
    razorpayPaymentId: string,
  ) {
    const existingPayment = await prisma.payment.findUnique({ where: { razorpayPaymentId } });
    if (existingPayment) return; // webhook + client-side verify can both fire for the same payment

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    const amountCents =
      (billingCycle === "ANNUAL" ? plan?.priceYearlyCents : plan?.priceMonthlyCents) ?? 0;

    const data = {
      planId,
      status: "ACTIVE" as const,
      billingCycle,
      currentPeriodEnd: new Date(Date.now() + PERIOD_MS[billingCycle]),
      razorpayOrderId,
      razorpayPaymentId,
    };
    await prisma.$transaction([
      prisma.subscription.upsert({
        where: { organizationId },
        update: data,
        create: { organizationId, ...data },
      }),
      prisma.payment.create({
        data: {
          organizationId,
          planId,
          amountCents,
          billingCycle,
          razorpayOrderId,
          razorpayPaymentId,
        },
      }),
    ]);
  }

  async listTransactions(userId: string) {
    const membership = await this.organizations.getPrimaryMembership(userId);
    return prisma.payment.findMany({
      where: { organizationId: membership.organizationId },
      include: { plan: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async handleWebhook(rawBody: Buffer, signature: string | undefined) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret || !signature) {
      throw new ServiceUnavailableException("Webhook isn't configured.");
    }

    const body = rawBody.toString("utf8");
    if (!validateWebhookSignature(body, signature, secret)) {
      throw new BadRequestException("Webhook signature verification failed.");
    }

    const event = JSON.parse(body) as { event: string; payload?: { payment?: { entity?: unknown } } };
    const payment = event.payload?.payment?.entity as
      | { id: string; order_id: string }
      | undefined;

    switch (event.event) {
      // Primary activation happens client-side via POST /billing/verify right after
      // checkout — this is a defensive backup in case that call never fires (e.g. the
      // browser closes before the redirect back).
      case "payment.captured": {
        if (!payment?.order_id) break;
        const razorpay = this.requireRazorpay();
        const order = await razorpay.orders.fetch(payment.order_id);
        const notes = order.notes as OrderNotes;
        if (notes.organizationId && notes.planId) {
          await this.activateSubscription(
            notes.organizationId,
            notes.planId,
            (notes.billingCycle as BillingCycle) ?? "MONTHLY",
            payment.order_id,
            payment.id,
          );
        }
        break;
      }
      case "payment.failed": {
        if (!payment?.order_id) break;
        const razorpay = this.requireRazorpay();
        const order = await razorpay.orders.fetch(payment.order_id).catch(() => null);
        const organizationId = (order?.notes as OrderNotes | undefined)?.organizationId;
        if (organizationId) {
          await prisma.subscription.updateMany({
            where: { organizationId },
            data: { status: "PAST_DUE" },
          });
        }
        break;
      }
      default:
        this.logger.debug(`Unhandled Razorpay event: ${event.event}`);
    }
  }
}

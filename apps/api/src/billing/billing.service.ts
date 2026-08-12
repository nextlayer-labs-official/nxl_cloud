import { randomBytes } from "node:crypto";
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { prisma, type BillingCycle, type Plan, type Subscription } from "@nextlayer/database";
import Razorpay from "razorpay";
import { validatePaymentVerification, validateWebhookSignature } from "razorpay/dist/utils/razorpay-utils";
import { OrganizationsService } from "../organizations/organizations.service";
import type { CreateOrderDto } from "./dto/create-order.dto";
import type { VerifyPaymentDto } from "./dto/verify-payment.dto";

const DAY_MS = 24 * 60 * 60 * 1000;
const PERIOD_MS: Record<BillingCycle, number> = {
  MONTHLY: 30 * DAY_MS,
  ANNUAL: 365 * DAY_MS,
};
const CYCLE_DAYS: Record<BillingCycle, number> = { MONTHLY: 30, ANNUAL: 365 };

interface OrderNotes {
  organizationId?: string;
  planId?: string;
  billingCycle?: string;
  /** "true" for a prorated mid-cycle plan switch — preserves the existing period
   *  instead of starting a fresh one, since the customer already paid for it. */
  prorated?: string;
  preservePeriodEnd?: string;
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

  /**
   * Same plan (renewal) or a fresh/first purchase: full price, charged immediately,
   * fresh `currentPeriodEnd` from today. A genuine mid-cycle switch to a *different*
   * plan while there's still paid time left goes through `createProratedSwitchOrder`
   * instead — real day-based proration, not the "upgrade full price / downgrade
   * scheduled for renewal" rule this replaced.
   */
  async createOrder(userId: string, dto: CreateOrderDto) {
    const membership = await this.organizations.getPrimaryMembership(userId);

    const plan = await prisma.plan.findUnique({ where: { id: dto.planId } });
    if (!plan) throw new NotFoundException("Plan not found.");

    const existingSubscription = await prisma.subscription.findUnique({
      where: { organizationId: membership.organizationId },
      include: { plan: true },
    });

    const isPlanSwitch =
      existingSubscription?.status === "ACTIVE" &&
      !!existingSubscription.currentPeriodEnd &&
      existingSubscription.currentPeriodEnd > new Date() &&
      existingSubscription.plan.id !== plan.id;

    if (isPlanSwitch) {
      return this.createProratedSwitchOrder(membership.organizationId, existingSubscription, plan);
    }

    const listPrice = dto.billingCycle === "ANNUAL" ? plan.priceYearlyCents : plan.priceMonthlyCents;
    if (!listPrice) {
      throw new BadRequestException("This plan isn't available for self-serve checkout.");
    }

    const razorpay = this.requireRazorpay();

    // An admin-set discount is prospective — it applies the next time the org actually
    // checks out (here), not retroactively to whatever they already paid for their
    // current period. This is the only place it's actually charged; it's cosmetic
    // everywhere else in the UI.
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

    return {
      requiresPayment: true as const,
      prorated: false,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: this.keyId,
    };
  }

  /**
   * Real day-based proration, no partial refunds (Razorpay doesn't do those
   * automatically) — a downgrade's unused value becomes account credit instead,
   * consumed against the next charge. Plan switches immediately either way;
   * `currentPeriodEnd` and `billingCycle` are preserved, not reset, since the
   * customer already paid through that date.
   */
  private async createProratedSwitchOrder(
    organizationId: string,
    existingSubscription: Subscription & { plan: Plan },
    newPlan: Plan,
  ) {
    const cycle = existingSubscription.billingCycle;
    const totalCycleDays = CYCLE_DAYS[cycle];
    const daysRemaining = Math.max(
      0,
      Math.ceil((existingSubscription.currentPeriodEnd!.getTime() - Date.now()) / DAY_MS),
    );

    const oldListPrice =
      cycle === "ANNUAL" ? existingSubscription.plan.priceYearlyCents : existingSubscription.plan.priceMonthlyCents;
    const newListPrice = cycle === "ANNUAL" ? newPlan.priceYearlyCents : newPlan.priceMonthlyCents;
    if (newListPrice === null) {
      throw new BadRequestException("This plan isn't available for self-serve checkout.");
    }

    const unusedOldValue = Math.round(((oldListPrice ?? 0) * daysRemaining) / totalCycleDays);
    const proratedNewCost = Math.round((newListPrice * daysRemaining) / totalCycleDays);
    let netCents = proratedNewCost - unusedOldValue;

    if (netCents > 0 && existingSubscription.discountPercent) {
      netCents = Math.round((netCents * (100 - existingSubscription.discountPercent)) / 100);
    }

    const creditAvailable = existingSubscription.creditBalanceCents;
    const amountAfterCredit = netCents - creditAvailable;

    if (amountAfterCredit <= 0) {
      // Fully covered by proration + existing credit — no payment needed, switch now.
      const newCreditBalance = creditAvailable - netCents;
      const updated = await prisma.subscription.update({
        where: { organizationId },
        data: { planId: newPlan.id, creditBalanceCents: newCreditBalance },
        include: { plan: true },
      });
      return {
        requiresPayment: false as const,
        planName: updated.plan.name,
        amountCents: netCents,
        creditBalanceCents: newCreditBalance,
      };
    }

    const razorpay = this.requireRazorpay();
    const order = await razorpay.orders.create({
      amount: amountAfterCredit,
      currency: "INR",
      receipt: randomBytes(10).toString("hex"),
      notes: {
        organizationId,
        planId: newPlan.id,
        billingCycle: cycle,
        prorated: "true",
        preservePeriodEnd: existingSubscription.currentPeriodEnd!.toISOString(),
      },
    });

    return {
      requiresPayment: true as const,
      prorated: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: this.keyId,
    };
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
      order.amount as number,
      dto.razorpayOrderId,
      dto.razorpayPaymentId,
      notes.prorated === "true" && notes.preservePeriodEnd ? new Date(notes.preservePeriodEnd) : undefined,
    );

    return prisma.subscription.findUnique({
      where: { organizationId: notes.organizationId },
      include: { plan: true },
    });
  }

  /**
   * `preservePeriodEnd` set = a prorated mid-cycle switch: keep the existing
   * period instead of starting a fresh one, and zero out the credit balance that
   * was just consumed to help pay for it. Unset = a fresh purchase/renewal:
   * start a brand-new period from today, same as always.
   */
  private async activateSubscription(
    organizationId: string,
    planId: string,
    billingCycle: BillingCycle,
    amountCents: number,
    razorpayOrderId: string,
    razorpayPaymentId: string,
    preservePeriodEnd?: Date,
  ) {
    const existingPayment = await prisma.payment.findUnique({ where: { razorpayPaymentId } });
    if (existingPayment) return; // webhook + client-side verify can both fire for the same payment

    const data = {
      planId,
      status: "ACTIVE" as const,
      billingCycle,
      currentPeriodEnd: preservePeriodEnd ?? new Date(Date.now() + PERIOD_MS[billingCycle]),
      razorpayOrderId,
      razorpayPaymentId,
      ...(preservePeriodEnd && { creditBalanceCents: 0 }),
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
      | { id: string; order_id: string; amount: number }
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
            payment.amount,
            payment.order_id,
            payment.id,
            notes.prorated === "true" && notes.preservePeriodEnd
              ? new Date(notes.preservePeriodEnd)
              : undefined,
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

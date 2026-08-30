import { randomBytes } from "node:crypto";
import {
  BadRequestException,
  ForbiddenException,
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

const BYTES_PER_GB = 1024 * 1024 * 1024;

interface OrderNotes {
  organizationId?: string;
  planId?: string;
  billingCycle?: string;
  /** "true" for a prorated upgrade order — on activation, resets creditBalanceCents
   *  to 0 (it was fully consumed toward this charge; see createUpgradeOrder). */
  prorated?: string;
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

  /**
   * Pure arithmetic, no side effects — shared by `createOrder` (which commits)
   * and `getOrderPreview` (which doesn't), so a quote can never drift from
   * what actually gets charged.
   */
  private computeListAmount(listPriceCents: number, discountPercent: number | null): number {
    return discountPercent ? Math.round((listPriceCents * (100 - discountPercent)) / 100) : listPriceCents;
  }

  /**
   * Pure arithmetic, no side effects — shared by `createUpgradeOrder` (which
   * commits) and `getOrderPreview` (which doesn't).
   */
  private computeUpgradeProration(
    existingSubscription: Subscription & { plan: Plan },
    newPlan: Plan,
    cycle: BillingCycle,
  ): { unusedOldValueCents: number; proratedNewCostCents: number; netCents: number; daysRemaining: number } {
    const totalCycleDays = CYCLE_DAYS[cycle];
    const daysRemaining = Math.max(
      0,
      Math.ceil((existingSubscription.currentPeriodEnd!.getTime() - Date.now()) / DAY_MS),
    );

    const oldListPrice =
      cycle === "ANNUAL" ? existingSubscription.plan.priceYearlyCents : existingSubscription.plan.priceMonthlyCents;
    const newListPrice = cycle === "ANNUAL" ? newPlan.priceYearlyCents : newPlan.priceMonthlyCents;

    const unusedOldValueCents = Math.round(((oldListPrice ?? 0) * daysRemaining) / totalCycleDays);
    const proratedNewCostCents = Math.round(((newListPrice ?? 0) * daysRemaining) / totalCycleDays);
    let netCents = Math.max(0, proratedNewCostCents - unusedOldValueCents);

    if (netCents > 0 && existingSubscription.discountPercent) {
      netCents = Math.round((netCents * (100 - existingSubscription.discountPercent)) / 100);
    }

    return { unusedOldValueCents, proratedNewCostCents, netCents, daysRemaining };
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
   * Same plan (renewal), a fresh/first purchase, or a plan change made after
   * the previous period already lapsed: full price, charged immediately,
   * fresh `currentPeriodEnd` from today. A genuine mid-cycle *upgrade* while
   * there's still paid time left goes through `createUpgradeOrder` instead
   * (real proration, credit consumed, fresh period). A mid-cycle
   * *downgrade* is refused outright — downgrades only take effect once the
   * current period ends, at which point it's just a normal purchase like
   * any other (this branch), not a special case.
   */
  async createOrder(userId: string, dto: CreateOrderDto) {
    const membership = await this.organizations.getPrimaryMembership(userId);
    if (membership.organization.partnerId) {
      throw new ForbiddenException(
        "This organization's plan is managed by a partner — contact them to change your plan.",
      );
    }

    const plan = await prisma.plan.findUnique({ where: { id: dto.planId } });
    if (!plan) throw new NotFoundException("Plan not found.");

    const existingSubscription = await prisma.subscription.findUnique({
      where: { organizationId: membership.organizationId },
      include: { plan: true },
    });

    const isPlanChange = !!existingSubscription && existingSubscription.plan.id !== plan.id;
    if (isPlanChange) {
      await this.assertStorageFitsPlan(membership.organizationId, existingSubscription!, plan);
    }

    const hasActivePeriod =
      existingSubscription?.status === "ACTIVE" &&
      !!existingSubscription.currentPeriodEnd &&
      existingSubscription.currentPeriodEnd > new Date();

    if (isPlanChange && hasActivePeriod) {
      const cycle = existingSubscription!.billingCycle;
      const oldListPrice =
        cycle === "ANNUAL"
          ? existingSubscription!.plan.priceYearlyCents
          : existingSubscription!.plan.priceMonthlyCents;
      const newListPrice = cycle === "ANNUAL" ? plan.priceYearlyCents : plan.priceMonthlyCents;
      const isUpgrade = (newListPrice ?? 0) > (oldListPrice ?? 0);

      if (isUpgrade) {
        return this.createUpgradeOrder(membership.organizationId, existingSubscription!, plan);
      }

      const readableDate = existingSubscription!.currentPeriodEnd!.toISOString().slice(0, 10);
      throw new BadRequestException(
        `You can switch to ${plan.name} once your current plan ends on ${readableDate} — downgrades take effect at renewal, not immediately.`,
      );
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
    const amount = this.computeListAmount(listPrice, existingSubscription?.discountPercent ?? null);

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
   * Upgrading: the unused value of the current plan is credited against the
   * new plan's prorated cost (plus any existing account credit, e.g. an
   * admin grant). Real day-based proration, no partial refunds (Razorpay
   * doesn't do those automatically). The plan switches immediately either
   * way; `currentPeriodEnd` always resets to a fresh period from the switch
   * date (via `activateSubscription`'s normal behavior) — the customer is
   * paying for a new, better period, not just topping up the old one.
   */
  private async createUpgradeOrder(
    organizationId: string,
    existingSubscription: Subscription & { plan: Plan },
    newPlan: Plan,
  ) {
    const cycle = existingSubscription.billingCycle;
    const newListPrice = cycle === "ANNUAL" ? newPlan.priceYearlyCents : newPlan.priceMonthlyCents;
    if (newListPrice === null) {
      throw new BadRequestException("This plan isn't available for self-serve checkout.");
    }

    const { netCents } = this.computeUpgradeProration(existingSubscription, newPlan, cycle);
    const creditAvailable = existingSubscription.creditBalanceCents;
    const amountAfterCredit = netCents - creditAvailable;

    if (amountAfterCredit <= 0) {
      // Fully covered by proration + existing credit — no payment needed, switch now.
      const newCreditBalance = creditAvailable - netCents;
      const updated = await prisma.subscription.update({
        where: { organizationId },
        data: {
          planId: newPlan.id,
          currentPeriodEnd: new Date(Date.now() + PERIOD_MS[cycle]),
          creditBalanceCents: newCreditBalance,
        },
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

  /**
   * Returns a human-readable reason if the org's current storage usage
   * wouldn't fit under `targetPlan`'s effective limit (its own
   * `storageLimitGbOverride` if admin-set, otherwise the plan's default), or
   * null if it fits. Read-only, no throw — shared by `assertStorageFitsPlan`
   * (which throws) and `getOrderPreview` (which surfaces it as `blocked`).
   */
  private async checkStorageFit(
    organizationId: string,
    existingSubscription: Subscription,
    targetPlan: Plan,
  ): Promise<string | null> {
    const limitBytes = this.organizations.effectiveLimitBytes({
      storageLimitGbOverride: existingSubscription.storageLimitGbOverride,
      plan: { storageLimitGb: targetPlan.storageLimitGb },
    });
    if (limitBytes === null) return null;

    const usedBytes = await this.organizations.getUsedBytes(organizationId);
    if (usedBytes > limitBytes) {
      const usedGb = (usedBytes / BYTES_PER_GB).toFixed(1);
      const limitGb = (limitBytes / BYTES_PER_GB).toFixed(1);
      return `You're using ${usedGb} GB, which is more than the ${limitGb} GB ${targetPlan.name} plan allows. Free up space before switching.`;
    }
    return null;
  }

  /**
   * Refuses any plan change (upgrade or downgrade) that would leave the org
   * storing more than the target plan's effective limit allows. In practice
   * this only ever bites on a downgrade (a plan change that increases the
   * limit can't newly violate it), but it's checked unconditionally for any
   * plan change rather than assuming that.
   */
  private async assertStorageFitsPlan(
    organizationId: string,
    existingSubscription: Subscription,
    targetPlan: Plan,
  ) {
    const reason = await this.checkStorageFit(organizationId, existingSubscription, targetPlan);
    if (reason) throw new BadRequestException(reason);
  }

  /**
   * Read-only preview of what `createOrder` would do for the same
   * `(planId, billingCycle)` — same branching (`isPlanChange`,
   * `hasActivePeriod`, `isUpgrade`), same pure helpers
   * (`computeListAmount`/`computeUpgradeProration`) and the same
   * `checkStorageFit`, but never creates a Razorpay order or writes to the
   * database. Used to power the checkout confirmation screen; its numbers
   * are guaranteed to match what `createOrder` actually commits, since both
   * call the exact same helpers.
   */
  async getOrderPreview(userId: string, dto: CreateOrderDto) {
    const membership = await this.organizations.getPrimaryMembership(userId);

    const plan = await prisma.plan.findUnique({ where: { id: dto.planId } });
    if (!plan) throw new NotFoundException("Plan not found.");

    const existingSubscription = await prisma.subscription.findUnique({
      where: { organizationId: membership.organizationId },
      include: { plan: true },
    });

    const isPlanChange = !!existingSubscription && existingSubscription.plan.id !== plan.id;

    const base = {
      planName: plan.name,
      currentPlanName: existingSubscription?.plan.name ?? null,
      currentPeriodEnd: existingSubscription?.currentPeriodEnd?.toISOString() ?? null,
    };

    if (isPlanChange) {
      const storageReason = await this.checkStorageFit(
        membership.organizationId,
        existingSubscription!,
        plan,
      );
      if (storageReason) {
        return {
          ...base,
          kind: "purchase" as const,
          blocked: true,
          blockedReason: storageReason,
          listPriceCents: null,
          discountPercent: null,
          unusedOldValueCents: null,
          proratedNewCostCents: null,
          amountPayableCents: 0,
          creditAppliedCents: 0,
          daysRemaining: null,
          newPeriodEndPreview: null,
          availableOn: null,
        };
      }
    }

    const hasActivePeriod =
      existingSubscription?.status === "ACTIVE" &&
      !!existingSubscription.currentPeriodEnd &&
      existingSubscription.currentPeriodEnd > new Date();

    if (isPlanChange && hasActivePeriod) {
      const cycle = existingSubscription!.billingCycle;
      const oldListPrice =
        cycle === "ANNUAL"
          ? existingSubscription!.plan.priceYearlyCents
          : existingSubscription!.plan.priceMonthlyCents;
      const newListPrice = cycle === "ANNUAL" ? plan.priceYearlyCents : plan.priceMonthlyCents;
      const isUpgrade = (newListPrice ?? 0) > (oldListPrice ?? 0);

      if (isUpgrade) {
        const { unusedOldValueCents, proratedNewCostCents, netCents, daysRemaining } =
          this.computeUpgradeProration(existingSubscription!, plan, cycle);
        const creditAvailable = existingSubscription!.creditBalanceCents;
        const amountPayableCents = Math.max(0, netCents - creditAvailable);
        const creditAppliedCents = Math.min(creditAvailable, netCents);
        return {
          ...base,
          kind: "upgrade" as const,
          blocked: false,
          blockedReason: null,
          listPriceCents: newListPrice,
          discountPercent: existingSubscription!.discountPercent,
          unusedOldValueCents,
          proratedNewCostCents,
          amountPayableCents,
          creditAppliedCents,
          daysRemaining,
          newPeriodEndPreview: new Date(Date.now() + PERIOD_MS[cycle]).toISOString(),
          availableOn: null,
        };
      }

      return {
        ...base,
        kind: "downgrade" as const,
        blocked: true,
        blockedReason: `You can switch to ${plan.name} once your current plan ends on ${existingSubscription!.currentPeriodEnd!.toISOString().slice(0, 10)} — downgrades take effect at renewal, not immediately.`,
        listPriceCents: null,
        discountPercent: null,
        unusedOldValueCents: null,
        proratedNewCostCents: null,
        amountPayableCents: 0,
        creditAppliedCents: 0,
        daysRemaining: null,
        newPeriodEndPreview: null,
        availableOn: existingSubscription!.currentPeriodEnd!.toISOString(),
      };
    }

    const listPrice = dto.billingCycle === "ANNUAL" ? plan.priceYearlyCents : plan.priceMonthlyCents;
    if (!listPrice) {
      return {
        ...base,
        kind: "purchase" as const,
        blocked: true,
        blockedReason: "This plan isn't available for self-serve checkout.",
        listPriceCents: null,
        discountPercent: null,
        unusedOldValueCents: null,
        proratedNewCostCents: null,
        amountPayableCents: 0,
        creditAppliedCents: 0,
        daysRemaining: null,
        newPeriodEndPreview: null,
        availableOn: null,
      };
    }

    const amountPayableCents = this.computeListAmount(
      listPrice,
      existingSubscription?.discountPercent ?? null,
    );
    const kind = !existingSubscription
      ? ("purchase" as const)
      : existingSubscription.plan.id === plan.id
        ? ("renew" as const)
        : ("downgrade" as const); // a plan change reached here only once the old period has lapsed

    return {
      ...base,
      kind,
      blocked: false,
      blockedReason: null,
      listPriceCents: listPrice,
      discountPercent: existingSubscription?.discountPercent ?? null,
      unusedOldValueCents: null,
      proratedNewCostCents: null,
      amountPayableCents,
      creditAppliedCents: 0,
      daysRemaining: null,
      newPeriodEndPreview: new Date(Date.now() + PERIOD_MS[dto.billingCycle]).toISOString(),
      availableOn: null,
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
      notes.prorated === "true",
    );

    return prisma.subscription.findUnique({
      where: { organizationId: notes.organizationId },
      include: { plan: true },
    });
  }

  /**
   * Always starts a fresh `currentPeriodEnd` from now — a plain purchase/
   * renewal and a paid upgrade-switch both work this way (a mid-cycle
   * downgrade never reaches here at all; `createOrder` refuses it outright,
   * see its own doc comment). `wasProratedUpgrade` zeroes out the credit
   * balance, since a paid upgrade order only ever gets created after
   * existing credit was fully applied toward it (see `createUpgradeOrder`)
   * — a plain purchase/renewal leaves any existing credit untouched.
   */
  private async activateSubscription(
    organizationId: string,
    planId: string,
    billingCycle: BillingCycle,
    amountCents: number,
    razorpayOrderId: string,
    razorpayPaymentId: string,
    wasProratedUpgrade: boolean,
  ) {
    const existingPayment = await prisma.payment.findUnique({ where: { razorpayPaymentId } });
    if (existingPayment) return; // webhook + client-side verify can both fire for the same payment

    const data = {
      planId,
      status: "ACTIVE" as const,
      billingCycle,
      currentPeriodEnd: new Date(Date.now() + PERIOD_MS[billingCycle]),
      razorpayOrderId,
      razorpayPaymentId,
      ...(wasProratedUpgrade && { creditBalanceCents: 0 }),
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
            notes.prorated === "true",
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

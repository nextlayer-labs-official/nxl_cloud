import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { prisma, type SubscriptionStatus } from "@nextlayer/database";
import Stripe from "stripe";
import { OrganizationsService } from "../organizations/organizations.service";
import type { CreateCheckoutSessionDto } from "./dto/create-checkout-session.dto";

/** current_period_end lives per subscription item (not on the subscription itself) as of API 2025+. */
function currentPeriodEnd(sub: Stripe.Subscription): Date {
  const seconds = sub.items.data[0]?.current_period_end;
  return new Date((seconds ?? Math.floor(Date.now() / 1000)) * 1000);
}

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "trialing":
      return "TRIALING";
    case "past_due":
    case "unpaid":
    case "incomplete":
    case "incomplete_expired":
      return "PAST_DUE";
    case "canceled":
      return "CANCELED";
    default:
      return "ACTIVE";
  }
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly stripe: Stripe | null;

  constructor(private readonly organizations: OrganizationsService) {
    const key = process.env.STRIPE_SECRET_KEY;
    this.stripe = key ? new Stripe(key) : null;
  }

  private requireStripe(): Stripe {
    if (!this.stripe) {
      throw new ServiceUnavailableException(
        "Billing isn't configured yet — add STRIPE_SECRET_KEY to enable it.",
      );
    }
    return this.stripe;
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

  async createCheckoutSession(userId: string, dto: CreateCheckoutSessionDto) {
    const stripe = this.requireStripe();
    const membership = await this.organizations.getPrimaryMembership(userId);

    const plan = await prisma.plan.findUnique({ where: { id: dto.planId } });
    if (!plan) throw new NotFoundException("Plan not found.");

    const amount = dto.billingCycle === "ANNUAL" ? plan.priceYearlyCents : plan.priceMonthlyCents;
    if (!amount) {
      throw new BadRequestException("This plan isn't available for self-serve checkout.");
    }

    const existing = await prisma.subscription.findUnique({
      where: { organizationId: membership.organizationId },
    });

    let stripeCustomerId = existing?.stripeCustomerId ?? undefined;
    if (!stripeCustomerId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const customer = await stripe.customers.create({
        email: user!.email,
        name: user!.name,
        metadata: { organizationId: membership.organizationId },
      });
      stripeCustomerId = customer.id;
    }

    const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: amount,
            recurring: { interval: dto.billingCycle === "ANNUAL" ? "year" : "month" },
            product_data: { name: `Nextlayer Cloud — ${plan.name}` },
          },
          quantity: 1,
        },
      ],
      success_url: `${webOrigin}/portal/settings?checkout=success`,
      cancel_url: `${webOrigin}/portal/settings?checkout=canceled`,
      metadata: {
        organizationId: membership.organizationId,
        planId: plan.id,
        billingCycle: dto.billingCycle,
      },
    });

    return { url: session.url };
  }

  async createPortalSession(userId: string) {
    const stripe = this.requireStripe();
    const membership = await this.organizations.getPrimaryMembership(userId);
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId: membership.organizationId },
    });
    if (!subscription?.stripeCustomerId) {
      throw new BadRequestException("No billing account yet — subscribe to a plan first.");
    }

    const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${webOrigin}/portal/settings`,
    });

    return { url: session.url };
  }

  async handleWebhook(rawBody: Buffer, signature: string | undefined) {
    const stripe = this.requireStripe();
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret || !signature) {
      throw new ServiceUnavailableException("Webhook isn't configured.");
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch (err) {
      throw new BadRequestException(`Webhook signature verification failed: ${(err as Error).message}`);
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const { organizationId, planId, billingCycle } = session.metadata ?? {};
        if (organizationId && planId && session.subscription) {
          const stripeSub = await stripe.subscriptions.retrieve(session.subscription as string);
          const data = {
            planId,
            status: mapStripeStatus(stripeSub.status),
            billingCycle: (billingCycle as "MONTHLY" | "ANNUAL") ?? "MONTHLY",
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: stripeSub.id,
            currentPeriodEnd: currentPeriodEnd(stripeSub),
          };
          await prisma.subscription.upsert({
            where: { organizationId },
            update: data,
            create: { organizationId, ...data },
          });
        }
        break;
      }
      case "customer.subscription.updated": {
        const stripeSub = event.data.object as Stripe.Subscription;
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: stripeSub.id },
          data: {
            status: mapStripeStatus(stripeSub.status),
            currentPeriodEnd: currentPeriodEnd(stripeSub),
          },
        });
        break;
      }
      case "customer.subscription.deleted": {
        const stripeSub = event.data.object as Stripe.Subscription;
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: stripeSub.id },
          data: { status: "CANCELED" },
        });
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as { subscription?: string }).subscription;
        if (subscriptionId) {
          await prisma.subscription.updateMany({
            where: { stripeSubscriptionId: subscriptionId },
            data: { status: "PAST_DUE" },
          });
        }
        break;
      }
      default:
        this.logger.debug(`Unhandled Stripe event: ${event.type}`);
    }
  }
}

import { prisma } from "@nextlayer/database";

/**
 * A scheduled downgrade takes effect once the org's already-paid-for period
 * ends — this app has no background job scheduler, so it's applied lazily
 * the next time the subscription is actually read, rather than on a cron.
 */
export async function applyDuePendingChange(organizationId: string): Promise<void> {
  const subscription = await prisma.subscription.findUnique({ where: { organizationId } });
  if (!subscription?.pendingPlanId) return;
  if (!subscription.currentPeriodEnd || subscription.currentPeriodEnd > new Date()) return;

  await prisma.subscription.update({
    where: { organizationId },
    data: {
      planId: subscription.pendingPlanId,
      billingCycle: subscription.pendingBillingCycle ?? subscription.billingCycle,
      pendingPlanId: null,
      pendingBillingCycle: null,
    },
  });
}

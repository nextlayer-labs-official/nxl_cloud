import { IsEnum, IsString } from "class-validator";
import type { BillingCycle } from "@nextlayer/database";

const BILLING_CYCLES: BillingCycle[] = ["MONTHLY", "ANNUAL"];

/**
 * Deliberately narrower than admin's UpdateSubscriptionDto — a partner can
 * change which plan and billing cycle their mapped customer is on, but not
 * touch discounts, comps, storage overrides, or credit balance. Those stay
 * platform-admin-only levers.
 */
export class UpdatePartnerSubscriptionDto {
  @IsString()
  planId!: string;

  @IsEnum(BILLING_CYCLES)
  billingCycle!: BillingCycle;
}

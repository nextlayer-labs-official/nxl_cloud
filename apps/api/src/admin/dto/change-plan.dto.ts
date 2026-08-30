import { IsEnum, IsString } from "class-validator";
import type { BillingCycle } from "@nextlayer/database";

const BILLING_CYCLES: BillingCycle[] = ["MONTHLY", "ANNUAL"];

/** The simple, rule-following plan change — see AdminService.changePlan. For discounts, comps, backdating, or an immediate downgrade, use UpdateSubscriptionDto (the advanced override) instead. */
export class ChangePlanDto {
  @IsString()
  planId!: string;

  @IsEnum(BILLING_CYCLES)
  billingCycle!: BillingCycle;
}

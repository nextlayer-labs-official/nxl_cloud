import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import type { BillingCycle, SubscriptionStatus } from "@nextlayer/database";

const SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "CANCELED",
];

const BILLING_CYCLES: BillingCycle[] = ["MONTHLY", "ANNUAL"];

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsEnum(SUBSCRIPTION_STATUSES)
  status?: SubscriptionStatus;

  @IsOptional()
  @IsEnum(BILLING_CYCLES)
  billingCycle?: BillingCycle;

  /** ISO date, or null to clear the renewal/expiry date. */
  @IsOptional()
  @IsDateString()
  currentPeriodEnd?: string | null;

  /** 0-100, or null to clear an existing discount. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  discountPercent?: number | null;

  /** ISO date, or null to clear an existing comp. */
  @IsOptional()
  @IsDateString()
  freeUntil?: string | null;

  /** GB, or null to fall back to the plan's default limit. */
  @IsOptional()
  @IsInt()
  @Min(0)
  storageLimitGbOverride?: number | null;
}

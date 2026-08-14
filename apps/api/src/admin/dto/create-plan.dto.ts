import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from "class-validator";

export class CreatePlanDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  /** null = "Custom" pricing (no self-serve checkout, e.g. Enterprise). */
  @IsOptional()
  @IsInt()
  @Min(0)
  priceMonthlyCents?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceYearlyCents?: number | null;

  /** null = unlimited storage. */
  @IsOptional()
  @IsInt()
  @Min(1)
  storageLimitGb?: number | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  /** The plan new signups trial by default. Setting this unsets it on every other plan. */
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  /** Whether new subscriptions to this plan start TRIALING (for trialDays) vs. straight to ACTIVE. */
  @IsOptional()
  @IsBoolean()
  trialEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  trialDays?: number;
}

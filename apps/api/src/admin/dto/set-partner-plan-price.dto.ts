import { IsInt, IsOptional, Min } from "class-validator";

/** Admin-negotiated pricing for one (partner, plan) pair — both omitted/null clears any override, falling back to the plan's own list price. */
export class SetPartnerPlanPriceDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  priceMonthlyCents?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceYearlyCents?: number | null;
}

import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";

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

  /** null = no seat limit. */
  @IsOptional()
  @IsInt()
  @Min(1)
  seatLimit?: number | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  /** The plan new signups trial by default. Setting this unsets it on every other plan. */
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

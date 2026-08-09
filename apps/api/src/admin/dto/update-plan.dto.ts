import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Min } from "class-validator";

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceMonthlyCents?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceYearlyCents?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  storageLimitGb?: number | null;

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

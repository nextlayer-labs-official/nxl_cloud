import { IsOptional, IsString } from "class-validator";

export class SetPartnerDistributorDto {
  /** A distributor id to move this partner under, or null / omitted to make it a direct (admin-managed) partner. */
  @IsOptional()
  @IsString()
  distributorId?: string | null;
}

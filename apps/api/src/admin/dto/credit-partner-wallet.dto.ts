import { IsInt, IsOptional, IsPositive, IsString } from "class-validator";

/** Manual top-up recorded against payment collected outside the platform — `note` is where the bank reference/cheque number/etc. goes. */
export class CreditPartnerWalletDto {
  @IsInt()
  @IsPositive()
  amountCents!: number;

  @IsOptional()
  @IsString()
  note?: string;
}

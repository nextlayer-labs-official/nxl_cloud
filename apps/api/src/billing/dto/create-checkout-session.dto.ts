import { IsIn, IsNotEmpty } from "class-validator";

export class CreateCheckoutSessionDto {
  @IsNotEmpty()
  planId!: string;

  @IsIn(["MONTHLY", "ANNUAL"])
  billingCycle!: "MONTHLY" | "ANNUAL";
}

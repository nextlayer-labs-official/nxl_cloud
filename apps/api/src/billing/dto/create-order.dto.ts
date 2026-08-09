import { IsIn, IsNotEmpty } from "class-validator";

export class CreateOrderDto {
  @IsNotEmpty()
  planId!: string;

  @IsIn(["MONTHLY", "ANNUAL"])
  billingCycle!: "MONTHLY" | "ANNUAL";
}

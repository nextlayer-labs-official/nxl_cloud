import { IsBoolean } from "class-validator";

export class ToggleCreditEnabledDto {
  @IsBoolean()
  creditEnabled!: boolean;
}

import { IsBoolean } from "class-validator";

export class UpdatePlatformSettingsDto {
  @IsBoolean()
  paymentsEnabled!: boolean;
}

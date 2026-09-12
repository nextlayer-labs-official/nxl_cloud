import { IsBoolean, IsOptional, IsString } from "class-validator";

export class UpdatePlatformSettingsDto {
  @IsOptional()
  @IsBoolean()
  paymentsEnabled?: boolean;

  @IsOptional()
  @IsString()
  defaultStorageProvider?: string;
}

import { IsInt, IsNotEmpty, IsPositive } from "class-validator";

export class ConfirmVersionDto {
  @IsNotEmpty()
  mimeType!: string;

  @IsInt()
  @IsPositive()
  sizeBytes!: number;

  @IsNotEmpty()
  storageKey!: string;

  @IsNotEmpty()
  storageProvider!: string;
}

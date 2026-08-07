import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString } from "class-validator";

export class ConfirmUploadDto {
  @IsNotEmpty()
  name!: string;

  @IsNotEmpty()
  mimeType!: string;

  @IsInt()
  @IsPositive()
  sizeBytes!: number;

  @IsOptional()
  @IsString()
  folderId?: string;

  @IsNotEmpty()
  storageKey!: string;
}

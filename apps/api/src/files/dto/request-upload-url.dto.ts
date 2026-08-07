import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString } from "class-validator";

export class RequestUploadUrlDto {
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
}

import { IsInt, IsNotEmpty, IsPositive } from "class-validator";

export class RequestVersionUploadUrlDto {
  @IsNotEmpty()
  mimeType!: string;

  @IsInt()
  @IsPositive()
  sizeBytes!: number;
}

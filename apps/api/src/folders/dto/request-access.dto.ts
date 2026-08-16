import { IsOptional, IsString, MaxLength } from "class-validator";

export class RequestAccessDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}

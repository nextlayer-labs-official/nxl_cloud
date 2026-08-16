import { IsOptional, IsString } from "class-validator";

export class MoveFileDto {
  @IsOptional()
  @IsString()
  folderId?: string | null;
}

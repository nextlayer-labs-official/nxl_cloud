import { IsOptional, IsString } from "class-validator";

export class MoveFolderDto {
  @IsOptional()
  @IsString()
  parentId?: string | null;
}

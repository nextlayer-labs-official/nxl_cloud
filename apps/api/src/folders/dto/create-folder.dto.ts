import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateFolderDto {
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}

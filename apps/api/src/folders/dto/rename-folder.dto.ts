import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class RenameFolderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  name!: string;
}

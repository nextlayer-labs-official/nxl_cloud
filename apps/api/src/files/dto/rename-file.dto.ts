import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class RenameFileDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  name!: string;
}

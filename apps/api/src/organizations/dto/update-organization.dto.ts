import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class UpdateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  name!: string;
}

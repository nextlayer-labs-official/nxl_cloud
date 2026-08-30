import { IsEmail, IsNotEmpty } from "class-validator";

export class PartnerLoginDto {
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  password!: string;
}

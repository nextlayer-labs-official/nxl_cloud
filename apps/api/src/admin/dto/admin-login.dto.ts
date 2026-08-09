import { IsEmail, IsNotEmpty } from "class-validator";

export class AdminLoginDto {
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  password!: string;
}

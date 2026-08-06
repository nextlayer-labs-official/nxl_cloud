import { IsEmail, IsNotEmpty, MinLength } from "class-validator";

export class RegisterDto {
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsNotEmpty()
  company!: string;

  @MinLength(8)
  password!: string;
}

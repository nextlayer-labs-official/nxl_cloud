import { IsEmail, IsNotEmpty } from "class-validator";

export class DistributorLoginDto {
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  password!: string;
}

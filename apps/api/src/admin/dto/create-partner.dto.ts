import { IsEmail, IsNotEmpty, IsString, Matches, MinLength } from "class-validator";

export class CreatePartnerDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  /** Customers enter this in Settings to map their org to this partner — keep it short and easy to read aloud/type. */
  @IsString()
  @Matches(/^[A-Za-z0-9-]{3,32}$/, {
    message: "Partner code must be 3-32 characters: letters, numbers, and hyphens only.",
  })
  code!: string;

  @MinLength(8)
  password!: string;
}

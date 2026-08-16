import { IsEmail, IsIn } from "class-validator";

export class ShareWithUserDto {
  @IsEmail()
  email!: string;

  @IsIn(["VIEWER", "EDITOR"])
  accessLevel!: "VIEWER" | "EDITOR";
}

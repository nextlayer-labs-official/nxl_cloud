import { IsIn } from "class-validator";

export class UpdatePermissionDto {
  @IsIn(["VIEWER", "EDITOR"])
  accessLevel!: "VIEWER" | "EDITOR";
}

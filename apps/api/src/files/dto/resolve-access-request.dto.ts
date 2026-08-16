import { IsIn, IsOptional } from "class-validator";

export class ResolveAccessRequestDto {
  @IsIn(["GRANT", "DENY"])
  decision!: "GRANT" | "DENY";

  @IsOptional()
  @IsIn(["VIEWER", "EDITOR"])
  accessLevel?: "VIEWER" | "EDITOR";
}

import { IsNotEmpty, IsString } from "class-validator";

export class ApplyPartnerCodeDto {
  @IsNotEmpty()
  @IsString()
  code!: string;
}

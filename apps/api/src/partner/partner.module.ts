import { Module } from "@nestjs/common";
import { EmailModule } from "../email/email.module";
import { PartnerAuthController } from "./partner-auth.controller";
import { PartnerAuthService } from "./partner-auth.service";
import { PartnerController } from "./partner.controller";
import { PartnerService } from "./partner.service";

@Module({
  imports: [EmailModule],
  controllers: [PartnerAuthController, PartnerController],
  providers: [PartnerAuthService, PartnerService],
})
export class PartnerModule {}

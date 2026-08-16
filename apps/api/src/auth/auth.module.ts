import { Module } from "@nestjs/common";
import { EmailModule } from "../email/email.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { StorageModule } from "../storage/storage.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

@Module({
  imports: [OrganizationsModule, StorageModule, EmailModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}

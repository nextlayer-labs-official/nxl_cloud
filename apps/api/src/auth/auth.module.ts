import { Module } from "@nestjs/common";
import { OrganizationsModule } from "../organizations/organizations.module";
import { StorageModule } from "../storage/storage.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

@Module({
  imports: [OrganizationsModule, StorageModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}

import { Module } from "@nestjs/common";
import { EmailModule } from "../email/email.module";
import { AdminAuthController } from "./admin-auth.controller";
import { AdminAuthService } from "./admin-auth.service";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

@Module({
  imports: [EmailModule],
  controllers: [AdminAuthController, AdminController],
  providers: [AdminAuthService, AdminService],
})
export class AdminModule {}

import { Module } from "@nestjs/common";
import { AdminModule } from "./admin/admin.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { BillingModule } from "./billing/billing.module";
import { FilesModule } from "./files/files.module";
import { FoldersModule } from "./folders/folders.module";
import { HealthModule } from "./health/health.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { ShareModule } from "./share/share.module";
import { StorageModule } from "./storage/storage.module";

@Module({
  imports: [
    HealthModule,
    AuthModule,
    OrganizationsModule,
    StorageModule,
    FoldersModule,
    FilesModule,
    ShareModule,
    BillingModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { AdminModule } from "./admin/admin.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { BillingModule } from "./billing/billing.module";
import { DistributorModule } from "./distributor/distributor.module";
import { FilesModule } from "./files/files.module";
import { FoldersModule } from "./folders/folders.module";
import { HealthModule } from "./health/health.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { PartnerModule } from "./partner/partner.module";
import { RetentionModule } from "./retention/retention.module";
import { ShareModule } from "./share/share.module";
import { StorageModule } from "./storage/storage.module";
import { SubscriptionEnforcementModule } from "./subscription-enforcement/subscription-enforcement.module";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    HealthModule,
    AuthModule,
    OrganizationsModule,
    StorageModule,
    FoldersModule,
    FilesModule,
    ShareModule,
    BillingModule,
    AdminModule,
    PartnerModule,
    DistributorModule,
    RetentionModule,
    SubscriptionEnforcementModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

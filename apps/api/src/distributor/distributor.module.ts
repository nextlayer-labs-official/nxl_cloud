import { Module } from "@nestjs/common";
import { DistributorAuthController } from "./distributor-auth.controller";
import { DistributorAuthService } from "./distributor-auth.service";
import { DistributorController } from "./distributor.controller";
import { DistributorService } from "./distributor.service";

@Module({
  controllers: [DistributorAuthController, DistributorController],
  providers: [DistributorAuthService, DistributorService],
})
export class DistributorModule {}

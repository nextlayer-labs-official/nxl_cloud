import { Module } from "@nestjs/common";
import { SubscriptionEnforcementService } from "./subscription-enforcement.service";

@Module({
  providers: [SubscriptionEnforcementService],
})
export class SubscriptionEnforcementModule {}

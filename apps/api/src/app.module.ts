import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [HealthModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

import { Module } from "@nestjs/common";
import { StorageModule } from "../storage/storage.module";
import { ShareController } from "./share.controller";
import { ShareService } from "./share.service";

@Module({
  imports: [StorageModule],
  controllers: [ShareController],
  providers: [ShareService],
})
export class ShareModule {}

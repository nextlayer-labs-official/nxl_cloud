import { Module } from "@nestjs/common";
import { EmailModule } from "../email/email.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { StorageModule } from "../storage/storage.module";
import { FoldersController } from "./folders.controller";
import { FoldersService } from "./folders.service";

@Module({
  imports: [OrganizationsModule, StorageModule, EmailModule],
  controllers: [FoldersController],
  providers: [FoldersService],
})
export class FoldersModule {}

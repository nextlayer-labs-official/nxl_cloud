import { Module } from "@nestjs/common";
import { EmailModule } from "../email/email.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { StorageModule } from "../storage/storage.module";
import { FilesController } from "./files.controller";
import { FilesService } from "./files.service";

@Module({
  imports: [OrganizationsModule, StorageModule, EmailModule],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}

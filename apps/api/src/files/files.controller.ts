import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { SessionGuard } from "../auth/guards/session.guard";
import { ConfirmUploadDto } from "./dto/confirm-upload.dto";
import { RequestUploadUrlDto } from "./dto/request-upload-url.dto";
import { FilesService } from "./files.service";

@Controller("files")
@UseGuards(SessionGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post("upload-url")
  requestUploadUrl(@Req() req: Request, @Body() dto: RequestUploadUrlDto) {
    return this.filesService.requestUploadUrl(req.user!.id, dto);
  }

  @Post()
  confirmUpload(@Req() req: Request, @Body() dto: ConfirmUploadDto) {
    return this.filesService.confirmUpload(req.user!.id, dto);
  }

  @Get(":id/download-url")
  getDownloadUrl(@Req() req: Request, @Param("id") id: string) {
    return this.filesService.getDownloadUrl(req.user!.id, id);
  }

  @Get(":id/preview-url")
  getPreviewUrl(@Req() req: Request, @Param("id") id: string) {
    return this.filesService.getPreviewUrl(req.user!.id, id);
  }

  @Delete(":id")
  async remove(@Req() req: Request, @Param("id") id: string) {
    await this.filesService.remove(req.user!.id, id);
    return { success: true };
  }

  @Post(":id/share")
  createShareLink(@Req() req: Request, @Param("id") id: string) {
    return this.filesService.createShareLink(req.user!.id, id);
  }
}

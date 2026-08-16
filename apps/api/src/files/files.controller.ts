import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { SessionGuard } from "../auth/guards/session.guard";
import { ConfirmUploadDto } from "./dto/confirm-upload.dto";
import { MoveFileDto } from "./dto/move-file.dto";
import { RenameFileDto } from "./dto/rename-file.dto";
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

  @Get("trash")
  listTrash(@Req() req: Request) {
    return this.filesService.listTrash(req.user!.id);
  }

  @Get("recent")
  getRecent(@Req() req: Request) {
    return this.filesService.getRecent(req.user!.id);
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

  @Patch(":id")
  rename(@Req() req: Request, @Param("id") id: string, @Body() dto: RenameFileDto) {
    return this.filesService.rename(req.user!.id, id, dto);
  }

  @Patch(":id/move")
  move(@Req() req: Request, @Param("id") id: string, @Body() dto: MoveFileDto) {
    return this.filesService.move(req.user!.id, id, dto);
  }

  @Get(":id/activity")
  getActivity(@Req() req: Request, @Param("id") id: string) {
    return this.filesService.getActivity(req.user!.id, id);
  }

  @Post(":id/restore")
  async restore(@Req() req: Request, @Param("id") id: string) {
    await this.filesService.restore(req.user!.id, id);
    return { success: true };
  }

  @Delete(":id/permanent")
  async permanentlyDelete(@Req() req: Request, @Param("id") id: string) {
    await this.filesService.permanentlyDelete(req.user!.id, id);
    return { success: true };
  }

  @Post(":id/share")
  createShareLink(@Req() req: Request, @Param("id") id: string) {
    return this.filesService.createShareLink(req.user!.id, id);
  }

  @Delete(":id/share")
  async removeShareLink(@Req() req: Request, @Param("id") id: string) {
    await this.filesService.removeShareLink(req.user!.id, id);
    return { success: true };
  }

  @Post(":id/star")
  async star(@Req() req: Request, @Param("id") id: string) {
    await this.filesService.star(req.user!.id, id);
    return { success: true };
  }

  @Delete(":id/star")
  async unstar(@Req() req: Request, @Param("id") id: string) {
    await this.filesService.unstar(req.user!.id, id);
    return { success: true };
  }
}

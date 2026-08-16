import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { EmailVerifiedGuard } from "../auth/guards/email-verified.guard";
import { SessionGuard } from "../auth/guards/session.guard";
import { ConfirmUploadDto } from "./dto/confirm-upload.dto";
import { MoveFileDto } from "./dto/move-file.dto";
import { RenameFileDto } from "./dto/rename-file.dto";
import { RequestAccessDto } from "./dto/request-access.dto";
import { RequestUploadUrlDto } from "./dto/request-upload-url.dto";
import { ResolveAccessRequestDto } from "./dto/resolve-access-request.dto";
import { ShareWithUserDto } from "./dto/share-with-user.dto";
import { UpdatePermissionDto } from "./dto/update-permission.dto";
import { FilesService } from "./files.service";

@Controller("files")
@UseGuards(SessionGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post("upload-url")
  @UseGuards(EmailVerifiedGuard)
  requestUploadUrl(@Req() req: Request, @Body() dto: RequestUploadUrlDto) {
    return this.filesService.requestUploadUrl(req.user!.id, dto);
  }

  @Post()
  @UseGuards(EmailVerifiedGuard)
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

  @Get(":id")
  getFile(@Req() req: Request, @Param("id") id: string) {
    return this.filesService.getFile(req.user!.id, id);
  }

  @Get(":id/access-status")
  getAccessStatus(@Req() req: Request, @Param("id") id: string) {
    return this.filesService.getAccessStatus(req.user!.id, id);
  }

  @Post(":id/request-access")
  @UseGuards(EmailVerifiedGuard)
  requestAccess(@Req() req: Request, @Param("id") id: string, @Body() dto: RequestAccessDto) {
    return this.filesService.requestAccess(req.user!.id, id, dto);
  }

  @Get(":id/access-requests")
  listAccessRequests(@Req() req: Request, @Param("id") id: string) {
    return this.filesService.listAccessRequests(req.user!.id, id);
  }

  @Post(":id/access-requests/:requestId/resolve")
  @UseGuards(EmailVerifiedGuard)
  resolveAccessRequest(
    @Req() req: Request,
    @Param("id") id: string,
    @Param("requestId") requestId: string,
    @Body() dto: ResolveAccessRequestDto,
  ) {
    return this.filesService.resolveFileAccessRequest(req.user!.id, id, requestId, dto);
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
  @UseGuards(EmailVerifiedGuard)
  async remove(@Req() req: Request, @Param("id") id: string) {
    await this.filesService.remove(req.user!.id, id);
    return { success: true };
  }

  @Patch(":id")
  @UseGuards(EmailVerifiedGuard)
  rename(@Req() req: Request, @Param("id") id: string, @Body() dto: RenameFileDto) {
    return this.filesService.rename(req.user!.id, id, dto);
  }

  @Patch(":id/move")
  @UseGuards(EmailVerifiedGuard)
  move(@Req() req: Request, @Param("id") id: string, @Body() dto: MoveFileDto) {
    return this.filesService.move(req.user!.id, id, dto);
  }

  @Get(":id/activity")
  getActivity(@Req() req: Request, @Param("id") id: string) {
    return this.filesService.getActivity(req.user!.id, id);
  }

  @Post(":id/restore")
  @UseGuards(EmailVerifiedGuard)
  async restore(@Req() req: Request, @Param("id") id: string) {
    await this.filesService.restore(req.user!.id, id);
    return { success: true };
  }

  @Delete(":id/permanent")
  @UseGuards(EmailVerifiedGuard)
  async permanentlyDelete(@Req() req: Request, @Param("id") id: string) {
    await this.filesService.permanentlyDelete(req.user!.id, id);
    return { success: true };
  }

  @Get(":id/share")
  getShareLinkStatus(@Req() req: Request, @Param("id") id: string) {
    return this.filesService.getShareLinkStatus(req.user!.id, id);
  }

  @Post(":id/share")
  @UseGuards(EmailVerifiedGuard)
  createShareLink(@Req() req: Request, @Param("id") id: string) {
    return this.filesService.createShareLink(req.user!.id, id);
  }

  @Delete(":id/share")
  @UseGuards(EmailVerifiedGuard)
  async removeShareLink(@Req() req: Request, @Param("id") id: string) {
    await this.filesService.removeShareLink(req.user!.id, id);
    return { success: true };
  }

  @Post(":id/permissions")
  @UseGuards(EmailVerifiedGuard)
  sharePermission(@Req() req: Request, @Param("id") id: string, @Body() dto: ShareWithUserDto) {
    return this.filesService.sharePermission(req.user!.id, id, dto);
  }

  @Get(":id/permissions")
  listPermissions(@Req() req: Request, @Param("id") id: string) {
    return this.filesService.listPermissions(req.user!.id, id);
  }

  @Patch(":id/permissions/:permissionId")
  @UseGuards(EmailVerifiedGuard)
  updatePermission(
    @Req() req: Request,
    @Param("id") id: string,
    @Param("permissionId") permissionId: string,
    @Body() dto: UpdatePermissionDto,
  ) {
    return this.filesService.updatePermission(req.user!.id, id, permissionId, dto.accessLevel);
  }

  @Delete(":id/permissions/:permissionId")
  @UseGuards(EmailVerifiedGuard)
  revokePermission(@Req() req: Request, @Param("id") id: string, @Param("permissionId") permissionId: string) {
    return this.filesService.revokePermission(req.user!.id, id, permissionId);
  }

  @Post(":id/star")
  @UseGuards(EmailVerifiedGuard)
  async star(@Req() req: Request, @Param("id") id: string) {
    await this.filesService.star(req.user!.id, id);
    return { success: true };
  }

  @Delete(":id/star")
  @UseGuards(EmailVerifiedGuard)
  async unstar(@Req() req: Request, @Param("id") id: string) {
    await this.filesService.unstar(req.user!.id, id);
    return { success: true };
  }
}

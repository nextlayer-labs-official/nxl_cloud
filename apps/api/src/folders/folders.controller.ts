import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { EmailVerifiedGuard } from "../auth/guards/email-verified.guard";
import { SessionGuard } from "../auth/guards/session.guard";
import { CreateFolderDto } from "./dto/create-folder.dto";
import { MoveFolderDto } from "./dto/move-folder.dto";
import { RenameFolderDto } from "./dto/rename-folder.dto";
import { RequestAccessDto } from "./dto/request-access.dto";
import { ResolveAccessRequestDto } from "./dto/resolve-access-request.dto";
import { ShareWithUserDto } from "./dto/share-with-user.dto";
import { UpdatePermissionDto } from "./dto/update-permission.dto";
import { FoldersService } from "./folders.service";

@Controller("folders")
@UseGuards(SessionGuard)
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Get()
  list(@Req() req: Request, @Query("parentId") parentId?: string) {
    return this.foldersService.listContents(req.user!.id, parentId);
  }

  @Get("search")
  search(@Req() req: Request, @Query("q") q?: string) {
    return this.foldersService.search(req.user!.id, q ?? "");
  }

  @Get("starred")
  getStarred(@Req() req: Request) {
    return this.foldersService.getStarred(req.user!.id);
  }

  @Get("trash")
  listTrash(@Req() req: Request) {
    return this.foldersService.listTrash(req.user!.id);
  }

  @Get("shared-with-me")
  getSharedWithMe(@Req() req: Request) {
    return this.foldersService.getSharedWithMe(req.user!.id);
  }

  @Post()
  @UseGuards(EmailVerifiedGuard)
  create(@Req() req: Request, @Body() dto: CreateFolderDto) {
    return this.foldersService.create(req.user!.id, dto);
  }

  @Get(":id/breadcrumb")
  getBreadcrumb(@Req() req: Request, @Param("id") id: string) {
    return this.foldersService.getBreadcrumb(req.user!.id, id);
  }

  @Delete(":id")
  @UseGuards(EmailVerifiedGuard)
  async remove(@Req() req: Request, @Param("id") id: string) {
    await this.foldersService.remove(req.user!.id, id);
    return { success: true };
  }

  @Post(":id/restore")
  @UseGuards(EmailVerifiedGuard)
  async restore(@Req() req: Request, @Param("id") id: string) {
    await this.foldersService.restore(req.user!.id, id);
    return { success: true };
  }

  @Delete(":id/permanent")
  @UseGuards(EmailVerifiedGuard)
  async permanentlyDelete(@Req() req: Request, @Param("id") id: string) {
    await this.foldersService.permanentlyDelete(req.user!.id, id);
    return { success: true };
  }

  @Patch(":id")
  @UseGuards(EmailVerifiedGuard)
  rename(@Req() req: Request, @Param("id") id: string, @Body() dto: RenameFolderDto) {
    return this.foldersService.rename(req.user!.id, id, dto);
  }

  @Patch(":id/move")
  @UseGuards(EmailVerifiedGuard)
  move(@Req() req: Request, @Param("id") id: string, @Body() dto: MoveFolderDto) {
    return this.foldersService.move(req.user!.id, id, dto);
  }

  @Get(":id/activity")
  getActivity(@Req() req: Request, @Param("id") id: string) {
    return this.foldersService.getActivity(req.user!.id, id);
  }

  @Get(":id/share")
  getShareLinkStatus(@Req() req: Request, @Param("id") id: string) {
    return this.foldersService.getShareLinkStatus(req.user!.id, id);
  }

  @Post(":id/share")
  @UseGuards(EmailVerifiedGuard)
  createShareLink(@Req() req: Request, @Param("id") id: string) {
    return this.foldersService.createShareLink(req.user!.id, id);
  }

  @Delete(":id/share")
  @UseGuards(EmailVerifiedGuard)
  async removeShareLink(@Req() req: Request, @Param("id") id: string) {
    await this.foldersService.removeShareLink(req.user!.id, id);
    return { success: true };
  }

  @Post(":id/permissions")
  @UseGuards(EmailVerifiedGuard)
  sharePermission(@Req() req: Request, @Param("id") id: string, @Body() dto: ShareWithUserDto) {
    return this.foldersService.sharePermission(req.user!.id, id, dto);
  }

  @Get(":id/permissions")
  listPermissions(@Req() req: Request, @Param("id") id: string) {
    return this.foldersService.listPermissions(req.user!.id, id);
  }

  @Patch(":id/permissions/:permissionId")
  @UseGuards(EmailVerifiedGuard)
  updatePermission(
    @Req() req: Request,
    @Param("id") id: string,
    @Param("permissionId") permissionId: string,
    @Body() dto: UpdatePermissionDto,
  ) {
    return this.foldersService.updatePermission(req.user!.id, id, permissionId, dto.accessLevel);
  }

  @Delete(":id/permissions/:permissionId")
  @UseGuards(EmailVerifiedGuard)
  revokePermission(@Req() req: Request, @Param("id") id: string, @Param("permissionId") permissionId: string) {
    return this.foldersService.revokePermission(req.user!.id, id, permissionId);
  }

  @Get(":id/access-status")
  getAccessStatus(@Req() req: Request, @Param("id") id: string) {
    return this.foldersService.getAccessStatus(req.user!.id, id);
  }

  @Post(":id/request-access")
  @UseGuards(EmailVerifiedGuard)
  requestAccess(@Req() req: Request, @Param("id") id: string, @Body() dto: RequestAccessDto) {
    return this.foldersService.requestAccess(req.user!.id, id, dto);
  }

  @Get(":id/access-requests")
  listAccessRequests(@Req() req: Request, @Param("id") id: string) {
    return this.foldersService.listAccessRequests(req.user!.id, id);
  }

  @Post(":id/access-requests/:requestId/resolve")
  @UseGuards(EmailVerifiedGuard)
  resolveAccessRequest(
    @Req() req: Request,
    @Param("id") id: string,
    @Param("requestId") requestId: string,
    @Body() dto: ResolveAccessRequestDto,
  ) {
    return this.foldersService.resolveFolderAccessRequest(req.user!.id, id, requestId, dto);
  }

  @Post(":id/star")
  @UseGuards(EmailVerifiedGuard)
  async star(@Req() req: Request, @Param("id") id: string) {
    await this.foldersService.star(req.user!.id, id);
    return { success: true };
  }

  @Delete(":id/star")
  @UseGuards(EmailVerifiedGuard)
  async unstar(@Req() req: Request, @Param("id") id: string) {
    await this.foldersService.unstar(req.user!.id, id);
    return { success: true };
  }
}

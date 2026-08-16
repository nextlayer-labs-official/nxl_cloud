import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { SessionGuard } from "../auth/guards/session.guard";
import { CreateFolderDto } from "./dto/create-folder.dto";
import { MoveFolderDto } from "./dto/move-folder.dto";
import { RenameFolderDto } from "./dto/rename-folder.dto";
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

  @Post()
  create(@Req() req: Request, @Body() dto: CreateFolderDto) {
    return this.foldersService.create(req.user!.id, dto);
  }

  @Get(":id/breadcrumb")
  getBreadcrumb(@Req() req: Request, @Param("id") id: string) {
    return this.foldersService.getBreadcrumb(req.user!.id, id);
  }

  @Delete(":id")
  async remove(@Req() req: Request, @Param("id") id: string) {
    await this.foldersService.remove(req.user!.id, id);
    return { success: true };
  }

  @Patch(":id")
  rename(@Req() req: Request, @Param("id") id: string, @Body() dto: RenameFolderDto) {
    return this.foldersService.rename(req.user!.id, id, dto);
  }

  @Patch(":id/move")
  move(@Req() req: Request, @Param("id") id: string, @Body() dto: MoveFolderDto) {
    return this.foldersService.move(req.user!.id, id, dto);
  }

  @Get(":id/activity")
  getActivity(@Req() req: Request, @Param("id") id: string) {
    return this.foldersService.getActivity(req.user!.id, id);
  }

  @Post(":id/share")
  createShareLink(@Req() req: Request, @Param("id") id: string) {
    return this.foldersService.createShareLink(req.user!.id, id);
  }

  @Delete(":id/share")
  async removeShareLink(@Req() req: Request, @Param("id") id: string) {
    await this.foldersService.removeShareLink(req.user!.id, id);
    return { success: true };
  }

  @Post(":id/star")
  async star(@Req() req: Request, @Param("id") id: string) {
    await this.foldersService.star(req.user!.id, id);
    return { success: true };
  }

  @Delete(":id/star")
  async unstar(@Req() req: Request, @Param("id") id: string) {
    await this.foldersService.unstar(req.user!.id, id);
    return { success: true };
  }
}

import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { SessionGuard } from "../auth/guards/session.guard";
import { CreateFolderDto } from "./dto/create-folder.dto";
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

  @Post(":id/share")
  createShareLink(@Req() req: Request, @Param("id") id: string) {
    return this.foldersService.createShareLink(req.user!.id, id);
  }
}

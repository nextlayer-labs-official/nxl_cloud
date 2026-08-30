import { Body, Controller, Delete, Get, Patch, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { SessionGuard } from "../auth/guards/session.guard";
import { ApplyPartnerCodeDto } from "./dto/apply-partner-code.dto";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";
import { OrganizationsService } from "./organizations.service";

@Controller("organizations")
@UseGuards(SessionGuard)
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get("usage")
  getUsage(@Req() req: Request) {
    return this.organizations.getUsage(req.user!.id);
  }

  @Patch()
  updateName(@Req() req: Request, @Body() dto: UpdateOrganizationDto) {
    return this.organizations.updateName(req.user!.id, dto);
  }

  @Post("partner-code")
  applyPartnerCode(@Req() req: Request, @Body() dto: ApplyPartnerCodeDto) {
    return this.organizations.applyPartnerCode(req.user!.id, dto.code);
  }

  @Delete("partner-code")
  removePartnerCode(@Req() req: Request) {
    return this.organizations.removePartnerCode(req.user!.id);
  }

  @Get("partner-change-request")
  getPartnerChangeRequest(@Req() req: Request) {
    return this.organizations.getPartnerChangeRequest(req.user!.id);
  }

  @Delete("partner-change-request")
  async cancelPartnerChangeRequest(@Req() req: Request) {
    await this.organizations.cancelPartnerChangeRequest(req.user!.id);
    return { success: true };
  }
}

import { Body, Controller, Get, Patch, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { SessionGuard } from "../auth/guards/session.guard";
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
}

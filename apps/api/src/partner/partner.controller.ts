import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { UpdatePartnerSubscriptionDto } from "./dto/update-partner-subscription.dto";
import { PartnerSessionGuard } from "./guards/partner-session.guard";
import { PartnerService } from "./partner.service";

@Controller("partner")
@UseGuards(PartnerSessionGuard)
export class PartnerController {
  constructor(private readonly partnerService: PartnerService) {}

  @Get("organizations")
  listOrganizations(@Req() req: Request) {
    return this.partnerService.listOrganizations(req.partner!.id);
  }

  @Get("plans")
  listPlans() {
    return this.partnerService.listPlans();
  }

  @Patch("organizations/:id/subscription")
  updateSubscription(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() dto: UpdatePartnerSubscriptionDto,
  ) {
    return this.partnerService.updateSubscription(req.partner!.id, id, dto);
  }

  @Get("change-requests")
  listChangeRequests(@Req() req: Request) {
    return this.partnerService.listChangeRequests(req.partner!.id);
  }

  @Post("change-requests/:id/approve")
  @HttpCode(HttpStatus.OK)
  approveChangeRequest(@Req() req: Request, @Param("id") id: string) {
    return this.partnerService.approveChangeRequest(req.partner!.id, id);
  }

  @Post("change-requests/:id/reject")
  @HttpCode(HttpStatus.OK)
  rejectChangeRequest(@Req() req: Request, @Param("id") id: string) {
    return this.partnerService.rejectChangeRequest(req.partner!.id, id);
  }

  @Get("plan-pricing")
  listPlanPricing(@Req() req: Request) {
    return this.partnerService.listPlanPricing(req.partner!.id);
  }

  @Get("wallet")
  getWallet(@Req() req: Request) {
    return this.partnerService.getWallet(req.partner!.id);
  }

  @Get("usage-summary")
  getUsageSummary(@Req() req: Request) {
    return this.partnerService.getUsageSummary(req.partner!.id);
  }
}

import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { CreatePartnerDto } from "../admin/dto/create-partner.dto";
import { CreditPartnerWalletDto } from "../admin/dto/credit-partner-wallet.dto";
import { SetPartnerPlanPriceDto } from "../admin/dto/set-partner-plan-price.dto";
import { DistributorSessionGuard } from "./guards/distributor-session.guard";
import { DistributorService } from "./distributor.service";

@Controller("distributor")
@UseGuards(DistributorSessionGuard)
export class DistributorController {
  constructor(private readonly distributorService: DistributorService) {}

  @Get("wallet")
  getWallet(@Req() req: Request) {
    return this.distributorService.getWallet(req.distributor!.id);
  }

  @Get("plan-pricing")
  listPlanPricing(@Req() req: Request) {
    return this.distributorService.listPlanPricing(req.distributor!.id);
  }

  @Get("partners")
  listPartners(@Req() req: Request) {
    return this.distributorService.listPartners(req.distributor!.id);
  }

  @Post("partners")
  createPartner(@Req() req: Request, @Body() dto: CreatePartnerDto) {
    return this.distributorService.createPartner(req.distributor!.id, dto);
  }

  @Get("partners/:id")
  getPartner(@Req() req: Request, @Param("id") id: string) {
    return this.distributorService.getPartner(req.distributor!.id, id);
  }

  @Post("partners/:id/suspend")
  @HttpCode(HttpStatus.OK)
  suspendPartner(@Req() req: Request, @Param("id") id: string) {
    return this.distributorService.suspendPartner(req.distributor!.id, id);
  }

  @Post("partners/:id/reactivate")
  @HttpCode(HttpStatus.OK)
  reactivatePartner(@Req() req: Request, @Param("id") id: string) {
    return this.distributorService.reactivatePartner(req.distributor!.id, id);
  }

  @Get("partners/:id/pricing")
  getPartnerPricing(@Req() req: Request, @Param("id") id: string) {
    return this.distributorService.getPartnerPricing(req.distributor!.id, id);
  }

  @Patch("partners/:id/pricing/:planId")
  setPartnerPlanPrice(
    @Req() req: Request,
    @Param("id") id: string,
    @Param("planId") planId: string,
    @Body() dto: SetPartnerPlanPriceDto,
  ) {
    return this.distributorService.setPartnerPlanPrice(req.distributor!.id, id, planId, dto);
  }

  @Get("partners/:id/wallet")
  getPartnerWallet(@Req() req: Request, @Param("id") id: string) {
    return this.distributorService.getPartnerWallet(req.distributor!.id, id);
  }

  @Post("partners/:id/wallet/credit")
  creditPartnerWallet(@Req() req: Request, @Param("id") id: string, @Body() dto: CreditPartnerWalletDto) {
    return this.distributorService.creditPartnerWallet(req.distributor!.id, id, dto);
  }

  @Get("partners/:id/usage-summary")
  getPartnerUsageSummary(@Req() req: Request, @Param("id") id: string) {
    return this.distributorService.getPartnerUsageSummary(req.distributor!.id, id);
  }
}

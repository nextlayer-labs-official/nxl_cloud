import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { AdminService } from "./admin.service";
import { ChangePlanDto } from "./dto/change-plan.dto";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { CreateDistributorDto } from "./dto/create-distributor.dto";
import { CreatePartnerDto } from "./dto/create-partner.dto";
import { CreatePlanDto } from "./dto/create-plan.dto";
import { CreditPartnerWalletDto } from "./dto/credit-partner-wallet.dto";
import { SetPartnerDistributorDto } from "./dto/set-partner-distributor.dto";
import { SetPartnerPlanPriceDto } from "./dto/set-partner-plan-price.dto";
import { ToggleCreditEnabledDto } from "./dto/toggle-credit-enabled.dto";
import { UpdatePlanDto } from "./dto/update-plan.dto";
import { UpdatePlatformSettingsDto } from "./dto/update-platform-settings.dto";
import { UpdateSubscriptionDto } from "./dto/update-subscription.dto";
import { AdminSessionGuard } from "./guards/admin-session.guard";

@Controller("admin")
@UseGuards(AdminSessionGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("overview")
  getOverview(@Query("from") from?: string, @Query("to") to?: string) {
    return this.adminService.getOverview(from, to);
  }

  @Get("organizations")
  listOrganizations() {
    return this.adminService.listOrganizations();
  }

  @Get("organizations/:id")
  getOrganization(@Param("id") id: string) {
    return this.adminService.getOrganization(id);
  }

  @Get("organizations/:id/transactions")
  getOrganizationTransactions(@Param("id") id: string) {
    return this.adminService.getOrganizationTransactions(id);
  }

  @Post("customers")
  createCustomer(@Req() req: Request, @Body() dto: CreateCustomerDto) {
    return this.adminService.createCustomer(dto, req.adminUser!);
  }

  @Post("organizations/:id/suspend")
  @HttpCode(HttpStatus.OK)
  suspendOrganization(@Req() req: Request, @Param("id") id: string) {
    return this.adminService.suspendOrganization(id, req.adminUser!);
  }

  @Post("organizations/:id/reactivate")
  @HttpCode(HttpStatus.OK)
  reactivateOrganization(@Req() req: Request, @Param("id") id: string) {
    return this.adminService.reactivateOrganization(id, req.adminUser!);
  }

  @Post("organizations/:id/members/:userId/verify-email")
  @HttpCode(HttpStatus.OK)
  markMemberVerified(@Param("id") id: string, @Param("userId") userId: string) {
    return this.adminService.markMemberVerified(id, userId);
  }

  @Post("organizations/:id/members/:userId/resend-verification")
  @HttpCode(HttpStatus.OK)
  resendMemberVerification(@Param("id") id: string, @Param("userId") userId: string) {
    return this.adminService.resendMemberVerification(id, userId);
  }

  @Patch("organizations/:id/subscription")
  updateSubscription(@Req() req: Request, @Param("id") id: string, @Body() dto: UpdateSubscriptionDto) {
    return this.adminService.updateSubscription(id, dto, req.adminUser!);
  }

  @Patch("organizations/:id/plan")
  changePlan(@Req() req: Request, @Param("id") id: string, @Body() dto: ChangePlanDto) {
    return this.adminService.changePlan(id, dto, req.adminUser!);
  }

  @Get("plans")
  listPlans() {
    return this.adminService.listPlans();
  }

  @Post("plans")
  createPlan(@Body() dto: CreatePlanDto) {
    return this.adminService.createPlan(dto);
  }

  @Patch("plans/:id")
  updatePlan(@Param("id") id: string, @Body() dto: UpdatePlanDto) {
    return this.adminService.updatePlan(id, dto);
  }

  @Delete("plans/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePlan(@Param("id") id: string) {
    await this.adminService.deletePlan(id);
  }

  @Get("audit-log")
  listAuditLog(@Query("take") take?: string, @Query("organizationId") organizationId?: string) {
    const parsed = take ? Number.parseInt(take, 10) : undefined;
    return this.adminService.listAuditLog(
      parsed && !Number.isNaN(parsed) ? parsed : undefined,
      organizationId,
    );
  }

  @Get("users")
  listUsers(@Query("search") search?: string, @Query("page") page?: string) {
    const parsedPage = page ? Number.parseInt(page, 10) : undefined;
    return this.adminService.listUsers(search, parsedPage && !Number.isNaN(parsedPage) ? parsedPage : undefined);
  }

  @Get("payments")
  listPayments(@Query("organizationId") organizationId?: string, @Query("page") page?: string) {
    const parsedPage = page ? Number.parseInt(page, 10) : undefined;
    return this.adminService.listPayments(organizationId, parsedPage && !Number.isNaN(parsedPage) ? parsedPage : undefined);
  }

  @Get("storage-usage")
  getStorageUsage() {
    return this.adminService.getStorageUsage();
  }

  @Get("search")
  search(@Query("q") q?: string) {
    return this.adminService.search(q ?? "");
  }

  @Get("partners")
  listPartners() {
    return this.adminService.listPartners();
  }

  @Get("partners/:id")
  getPartner(@Param("id") id: string) {
    return this.adminService.getPartner(id);
  }

  @Post("partners")
  createPartner(@Body() dto: CreatePartnerDto) {
    return this.adminService.createPartner(dto);
  }

  @Post("partners/:id/suspend")
  @HttpCode(HttpStatus.OK)
  suspendPartner(@Param("id") id: string) {
    return this.adminService.suspendPartner(id);
  }

  @Post("partners/:id/reactivate")
  @HttpCode(HttpStatus.OK)
  reactivatePartner(@Param("id") id: string) {
    return this.adminService.reactivatePartner(id);
  }

  @Get("partners/:id/pricing")
  getPartnerPricing(@Param("id") id: string) {
    return this.adminService.getPartnerPricing(id);
  }

  @Patch("partners/:id/pricing/:planId")
  setPartnerPlanPrice(
    @Param("id") id: string,
    @Param("planId") planId: string,
    @Body() dto: SetPartnerPlanPriceDto,
  ) {
    return this.adminService.setPartnerPlanPrice(id, planId, dto);
  }

  @Get("partners/:id/wallet")
  getPartnerWallet(@Param("id") id: string) {
    return this.adminService.getPartnerWallet(id);
  }

  @Post("partners/:id/wallet/credit")
  creditPartnerWallet(@Req() req: Request, @Param("id") id: string, @Body() dto: CreditPartnerWalletDto) {
    return this.adminService.creditPartnerWallet(req.adminUser!.id, id, dto);
  }

  @Get("partners/:id/usage-summary")
  getPartnerUsageSummary(@Param("id") id: string) {
    return this.adminService.getPartnerUsageSummary(id);
  }

  @Patch("partners/:id/distributor")
  setPartnerDistributor(@Param("id") id: string, @Body() dto: SetPartnerDistributorDto) {
    return this.adminService.setPartnerDistributor(id, dto);
  }

  // --- Distributors ---

  @Get("distributors")
  listDistributors() {
    return this.adminService.listDistributors();
  }

  @Get("distributors/:id")
  getDistributor(@Param("id") id: string) {
    return this.adminService.getDistributor(id);
  }

  @Post("distributors")
  createDistributor(@Body() dto: CreateDistributorDto) {
    return this.adminService.createDistributor(dto);
  }

  @Post("distributors/:id/suspend")
  @HttpCode(HttpStatus.OK)
  suspendDistributor(@Param("id") id: string) {
    return this.adminService.suspendDistributor(id);
  }

  @Post("distributors/:id/reactivate")
  @HttpCode(HttpStatus.OK)
  reactivateDistributor(@Param("id") id: string) {
    return this.adminService.reactivateDistributor(id);
  }

  @Patch("distributors/:id/credit-enabled")
  setDistributorCreditEnabled(@Param("id") id: string, @Body() dto: ToggleCreditEnabledDto) {
    return this.adminService.setDistributorCreditEnabled(id, dto);
  }

  @Get("distributors/:id/pricing")
  getDistributorPricing(@Param("id") id: string) {
    return this.adminService.getDistributorPricing(id);
  }

  @Patch("distributors/:id/pricing/:planId")
  setDistributorPlanPrice(
    @Param("id") id: string,
    @Param("planId") planId: string,
    @Body() dto: SetPartnerPlanPriceDto,
  ) {
    return this.adminService.setDistributorPlanPrice(id, planId, dto);
  }

  @Get("distributors/:id/wallet")
  getDistributorWallet(@Param("id") id: string) {
    return this.adminService.getDistributorWallet(id);
  }

  @Post("distributors/:id/wallet/credit")
  creditDistributorWallet(@Req() req: Request, @Param("id") id: string, @Body() dto: CreditPartnerWalletDto) {
    return this.adminService.creditDistributorWallet(req.adminUser!.id, id, dto);
  }

  @Get("settings")
  getSettings() {
    return this.adminService.getSettings();
  }

  @Patch("settings")
  updateSettings(@Req() req: Request, @Body() dto: UpdatePlatformSettingsDto) {
    return this.adminService.updateSettings(req.adminUser!.id, dto, req.adminUser!);
  }
}

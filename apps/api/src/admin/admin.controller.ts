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
  UseGuards,
} from "@nestjs/common";
import { AdminService } from "./admin.service";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { CreatePlanDto } from "./dto/create-plan.dto";
import { UpdatePlanDto } from "./dto/update-plan.dto";
import { UpdateSubscriptionDto } from "./dto/update-subscription.dto";
import { AdminSessionGuard } from "./guards/admin-session.guard";

@Controller("admin")
@UseGuards(AdminSessionGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("overview")
  getOverview() {
    return this.adminService.getOverview();
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
  createCustomer(@Body() dto: CreateCustomerDto) {
    return this.adminService.createCustomer(dto);
  }

  @Post("organizations/:id/suspend")
  @HttpCode(HttpStatus.OK)
  suspendOrganization(@Param("id") id: string) {
    return this.adminService.suspendOrganization(id);
  }

  @Post("organizations/:id/reactivate")
  @HttpCode(HttpStatus.OK)
  reactivateOrganization(@Param("id") id: string) {
    return this.adminService.reactivateOrganization(id);
  }

  @Patch("organizations/:id/subscription")
  updateSubscription(@Param("id") id: string, @Body() dto: UpdateSubscriptionDto) {
    return this.adminService.updateSubscription(id, dto);
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
}

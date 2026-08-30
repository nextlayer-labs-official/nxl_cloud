import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { OrganizationsService } from "../organizations/organizations.service";
import { AuthService } from "./auth.service";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { DeleteAccountDto } from "./dto/delete-account.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import { SESSION_COOKIE, SessionGuard } from "./guards/session.guard";

const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly organizations: OrganizationsService,
  ) {}

  @Post("register")
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, sessionToken } = await this.authService.register(dto, req);
    this.setSessionCookie(res, sessionToken);
    return { user };
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, sessionToken } = await this.authService.login(dto, req);
    this.setSessionCookie(res, sessionToken);
    return { user };
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionGuard)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.cookies?.[SESSION_COOKIE]);
    res.clearCookie(SESSION_COOKIE, { path: "/" });
    return { success: true };
  }

  @Get("me")
  @UseGuards(SessionGuard)
  async me(@Req() req: Request) {
    const [membership, partner] = await Promise.all([
      this.organizations.getPrimaryMembership(req.user!.id),
      this.organizations.getPartner(req.user!.id),
    ]);
    return {
      user: req.user,
      organization: {
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
        role: membership.role,
        partner,
      },
    };
  }

  @Patch("me")
  @UseGuards(SessionGuard)
  updateProfile(@Req() req: Request, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user!.id, dto);
  }

  @Post("change-password")
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionGuard)
  async changePassword(@Req() req: Request, @Body() dto: ChangePasswordDto) {
    await this.authService.changePassword(req.user!.id, dto);
    return { success: true };
  }

  @Post("verify-email")
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    await this.authService.verifyEmail(dto);
    return { success: true };
  }

  @Post("resend-verification")
  @HttpCode(HttpStatus.OK)
  @UseGuards(SessionGuard)
  async resendVerification(@Req() req: Request) {
    await this.authService.resendVerification(req.user!.id);
    return { success: true };
  }

  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto);
    return { success: true };
  }

  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);
    return { success: true };
  }

  @Delete("me")
  @UseGuards(SessionGuard)
  async deleteAccount(
    @Req() req: Request,
    @Body() dto: DeleteAccountDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.deleteAccount(req.user!.id, dto);
    res.clearCookie(SESSION_COOKIE, { path: "/" });
    return { success: true };
  }

  private setSessionCookie(res: Response, token: string) {
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_MS,
    });
  }
}

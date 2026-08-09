import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import { AdminAuthService } from "./admin-auth.service";
import { AdminLoginDto } from "./dto/admin-login.dto";
import { ADMIN_SESSION_COOKIE, AdminSessionGuard } from "./guards/admin-session.guard";

const ADMIN_SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

@Controller("admin/auth")
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: AdminLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { adminUser, sessionToken } = await this.adminAuthService.login(dto, req);
    res.cookie(ADMIN_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ADMIN_SESSION_MAX_AGE_MS,
    });
    return { adminUser };
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AdminSessionGuard)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.adminAuthService.logout(req.cookies?.[ADMIN_SESSION_COOKIE]);
    res.clearCookie(ADMIN_SESSION_COOKIE, { path: "/" });
    return { success: true };
  }

  @Get("me")
  @UseGuards(AdminSessionGuard)
  me(@Req() req: Request) {
    return { adminUser: req.adminUser };
  }
}

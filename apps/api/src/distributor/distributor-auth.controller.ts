import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import { DistributorLoginDto } from "./dto/distributor-login.dto";
import { DISTRIBUTOR_SESSION_COOKIE, DistributorSessionGuard } from "./guards/distributor-session.guard";
import { DistributorAuthService } from "./distributor-auth.service";

const DISTRIBUTOR_SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

@Controller("distributor/auth")
export class DistributorAuthController {
  constructor(private readonly distributorAuthService: DistributorAuthService) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: DistributorLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { distributor, sessionToken } = await this.distributorAuthService.login(dto, req);
    res.cookie(DISTRIBUTOR_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: DISTRIBUTOR_SESSION_MAX_AGE_MS,
    });
    return { distributor };
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @UseGuards(DistributorSessionGuard)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.distributorAuthService.logout(req.cookies?.[DISTRIBUTOR_SESSION_COOKIE]);
    res.clearCookie(DISTRIBUTOR_SESSION_COOKIE, { path: "/" });
    return { success: true };
  }

  @Get("me")
  @UseGuards(DistributorSessionGuard)
  me(@Req() req: Request) {
    return { distributor: req.distributor };
  }
}

import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import { PartnerLoginDto } from "./dto/partner-login.dto";
import { PARTNER_SESSION_COOKIE, PartnerSessionGuard } from "./guards/partner-session.guard";
import { PartnerAuthService } from "./partner-auth.service";

const PARTNER_SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

@Controller("partner/auth")
export class PartnerAuthController {
  constructor(private readonly partnerAuthService: PartnerAuthService) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: PartnerLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { partner, sessionToken } = await this.partnerAuthService.login(dto, req);
    res.cookie(PARTNER_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: PARTNER_SESSION_MAX_AGE_MS,
    });
    return { partner };
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @UseGuards(PartnerSessionGuard)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.partnerAuthService.logout(req.cookies?.[PARTNER_SESSION_COOKIE]);
    res.clearCookie(PARTNER_SESSION_COOKIE, { path: "/" });
    return { success: true };
  }

  @Get("me")
  @UseGuards(PartnerSessionGuard)
  me(@Req() req: Request) {
    return { partner: req.partner };
  }
}

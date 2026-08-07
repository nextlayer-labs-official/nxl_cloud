import { Controller, Get, Param } from "@nestjs/common";
import { ShareService } from "./share.service";

/** Public — no SessionGuard. Anyone with the token can resolve a share link. */
@Controller("share")
export class ShareController {
  constructor(private readonly shareService: ShareService) {}

  @Get(":token")
  resolve(@Param("token") token: string) {
    return this.shareService.resolve(token);
  }
}

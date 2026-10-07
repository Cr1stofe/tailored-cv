import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service";
import {
  COOKIE_SID_KEY,
  SessionService,
  setSessionCookie,
  clearSessionCookie,
  type SessionData,
} from "./services/session.service";
import { LoginDto } from "./dto/login.dto";
import { Public } from "../common/decorators/public.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AuthGuard } from "../common/guards/auth.guard";

@Controller("auth")
@UseGuards(AuthGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
  ) {}

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = req.ip || req.socket?.remoteAddress || "";
    const ua = (req.headers["user-agent"] as string) || "";

    const { sid, maxAgeSec, title, user } = await this.authService.login(
      dto,
      ip,
      ua,
    );

    setSessionCookie(res, sid, maxAgeSec);
    return { title, user };
  }

  @Public()
  @Delete("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const sid = req.cookies?.[COOKIE_SID_KEY] || req.cookies?.["sid"];
    await this.sessionService.invalidate(sid);
    clearSessionCookie(res);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Vary", "Cookie");
  }

  @Get("session")
  getSession(@CurrentUser() session: SessionData) {
    return {
      title: "valida",
      name: session.name,
      username: session.username,
      email: session.email,
    };
  }
}

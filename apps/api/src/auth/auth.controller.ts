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
import {
  ApiCookieAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

@Controller("auth")
@ApiTags("Authentication")
@UseGuards(AuthGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
  ) {}

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Create a user session" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["email", "password"],
      properties: {
        email: { type: "string", format: "email", example: "user@example.com" },
        password: {
          type: "string",
          format: "password",
          example: "your-password",
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: "Session created successfully." })
  @ApiResponse({ status: 401, description: "Invalid credentials." })
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
  @ApiOperation({ summary: "End the current user session" })
  @ApiResponse({
    status: 204,
    description: "Session invalidated successfully.",
  })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const sid = req.cookies?.[COOKIE_SID_KEY] || req.cookies?.["sid"];
    await this.sessionService.invalidate(sid);
    clearSessionCookie(res);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Vary", "Cookie");
  }

  @Get("session")
  @ApiOperation({ summary: "Get the current authenticated session" })
  @ApiCookieAuth("sessionCookie")
  @ApiResponse({ status: 200, description: "Authenticated session details." })
  @ApiResponse({ status: 401, description: "Authentication required." })
  getSession(@CurrentUser() session: SessionData) {
    return {
      title: "valida",
      name: session.name,
      username: session.username,
      email: session.email,
    };
  }
}

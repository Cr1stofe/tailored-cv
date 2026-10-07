import { Module } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { SessionService } from "./services/session.service";
import { PasswordService } from "../common/security/password.service";
import { AuthGuard } from "../common/guards/auth.guard";

@Module({
  controllers: [AuthController],
  providers: [AuthService, SessionService, PasswordService, AuthGuard],
  exports: [SessionService, PasswordService, AuthGuard],
})
export class AuthModule {}

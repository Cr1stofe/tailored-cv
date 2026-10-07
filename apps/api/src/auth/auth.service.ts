import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
  OnModuleInit,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PasswordService } from "../common/security/password.service";
import { SessionService } from "./services/session.service";
import { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly sessionService: SessionService,
  ) {}

  async onModuleInit() {
    await this.ensureInitialUser();
  }

  private async ensureInitialUser() {
    try {
      const email = process.env.INITIAL_USER_EMAIL?.toLowerCase().trim();
      const password = process.env.INITIAL_USER_PASSWORD;
      const rawName = process.env.INITIAL_USER_NAME || "Administrador";
      const name = rawName.replace(/^["']|["']$/g, "").trim();

      const rawUsername = process.env.INITIAL_USER_USERNAME || "admin";
      const username = rawUsername.replace(/^["']|["']$/g, "").trim();

      if (!email || !password) {
        this.logger.log(
          "INITIAL_USER_EMAIL ou INITIAL_USER_PASSWORD não configurados no ambiente. Auto-provisionamento de usuário inicial ignorado.",
        );
        return;
      }

      const hashedPassword = await this.passwordService.hash(password);

      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!existingUser) {
        await this.prisma.user.create({
          data: {
            email,
            password: hashedPassword,
            name,
            username,
          },
        });
        this.logger.log(
          `Usuário inicial [${email}] provisionado com sucesso (${name} / @${username}).`,
        );
      } else {
        await this.prisma.user.update({
          where: { email },
          data: {
            password: hashedPassword,
            name,
            username,
          },
        });
        this.logger.log(
          `Usuário [${email}] atualizado com sucesso (${name} / @${username}).`,
        );
      }
    } catch (err) {
      this.logger.warn(
        `Falha ao verificar/provisionar usuário inicial: ${err}`,
      );
    }
  }

  async login(dto: LoginDto, ip: string, ua: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) {
      throw new HttpException(
        { title: "email ou senha incorretos" },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const isPasswordValid = await this.passwordService.verify(
      dto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new HttpException(
        { title: "email ou senha incorretos" },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const { sid, maxAgeSec } = await this.sessionService.create({
      userId: user.id,
      ip,
      ua,
    });

    return {
      sid,
      maxAgeSec,
      title: "login realizado com sucesso",
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
      },
    };
  }
}

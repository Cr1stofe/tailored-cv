import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import cookieParser from "cookie-parser";
import type { NextFunction, Request, Response } from "express";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/http-exception.filter";

async function bootstrap(): Promise<void> {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();
  app.getHttpAdapter().getInstance().set("trust proxy", 1);
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );
    next();
  });

  app.use(cookieParser());

  const configService = app.get(ConfigService);
  const port = configService.get<number>("API_PORT", 3001);
  const corsOrigin = configService.get<string>(
    "CORS_ORIGIN",
    "http://localhost:3000",
  );

  if (corsOrigin === "true" && process.env.NODE_ENV === "production") {
    throw new Error(
      "CORS_ORIGIN=true não é permitido em produção com cookies.",
    );
  }

  const allowedOrigins = corsOrigin.split(",").map((origin) => origin.trim());
  app.enableCors({
    origin: corsOrigin === "true" ? true : allowedOrigins,
    credentials: true,
    maxAge: 86400,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(port, "0.0.0.0");
  logger.log(`Tailored CV API running on port ${port}`);
}

bootstrap().catch((err: unknown) => {
  const logger = new Logger("BootstrapError");
  logger.error(
    "Failed to start application",
    err instanceof Error ? err.stack : err,
  );
  process.exit(1);
});

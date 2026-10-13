import "./observability/instrument";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger as NestLogger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Logger as PinoNestLogger } from "nestjs-pino";
import cookieParser from "cookie-parser";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/http-exception.filter";
import { InMemoryRateLimiter } from "./common/security/rate-limit";

async function bootstrap(): Promise<void> {
  const logger = new NestLogger("Bootstrap");
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    bufferLogs: true,
  });
  app.useLogger(app.get(PinoNestLogger));

  app.enableShutdownHooks();
  app.getHttpAdapter().getInstance().set("trust proxy", 1);
  app.use(express.json({ limit: "256kb" }));
  app.use(express.urlencoded({ extended: false, limit: "64kb" }));
  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = (req as Request & { id?: string }).id;
    if (requestId) {
      res.setHeader("X-Request-Id", requestId);
    }
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    const isSwaggerRoute =
      req.path === "/docs" || req.path.startsWith("/docs/");
    res.setHeader(
      "Content-Security-Policy",
      isSwaggerRoute
        ? "default-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://validator.swagger.io; script-src 'self' 'unsafe-inline' https:"
        : "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
    );
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    );
    if (process.env.NODE_ENV === "production") {
      res.setHeader(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains",
      );
    }
    if (req.path.startsWith("/.")) {
      res.status(404).end();
      return;
    }
    next();
  });

  const rateLimiter = new InMemoryRateLimiter();
  app.use(rateLimiter.middleware());

  app.use(cookieParser());

  const configService = app.get(ConfigService);
  const port = configService.get<number>("API_PORT", 3001);
  const swaggerEnabled = configService.get<boolean>("SWAGGER_ENABLED", false);
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

  app.useGlobalFilters(app.get(AllExceptionsFilter));

  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("Tailored CV API")
      .setDescription(
        "API for analyzing job opportunities and generating faithful, tailored resumes.",
      )
      .setVersion("1.0")
      .addCookieAuth("sid")
      .addCookieAuth("__Secure-sid")
      .addBearerAuth()
      .build();
    const documentFactory = () =>
      SwaggerModule.createDocument(app, swaggerConfig);

    SwaggerModule.setup("docs", app, documentFactory, {
      jsonDocumentUrl: "docs/openapi.json",
      customSiteTitle: "Tailored CV API Documentation",
      customCss: `
        .swagger-ui .topbar { display: none; }
        .swagger-ui .information-container { padding-top: 28px; }
      `,
    });
    logger.log("Swagger documentation enabled at /docs");
  }

  await app.listen(port, "0.0.0.0");
  logger.log(`Tailored CV API running on port ${port}`);
}

bootstrap().catch((err: unknown) => {
  const logger = new NestLogger("BootstrapError");
  logger.error(
    "Failed to start application",
    err instanceof Error ? err.stack : err,
  );
  process.exit(1);
});

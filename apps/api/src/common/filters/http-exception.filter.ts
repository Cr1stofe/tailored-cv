import {
  ExceptionFilter,
  Catch,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import type { ArgumentsHost } from "@nestjs/common";
import { SentryExceptionCaptured } from "@sentry/nestjs";
import { Request, Response } from "express";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";

@Injectable()
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    @InjectPinoLogger(AllExceptionsFilter.name)
    private readonly logger: PinoLogger,
  ) {}

  @SentryExceptionCaptured()
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = "Internal server error";

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.getResponse();
    } else if (exception instanceof Error) {
      const errStr = exception.message || "";
      if (
        errStr.includes("503") ||
        errStr.includes("high demand") ||
        errStr.includes("UNAVAILABLE")
      ) {
        status = HttpStatus.SERVICE_UNAVAILABLE;
        message = {
          message:
            "O serviço de IA do Google Gemini está sob alta demanda temporária (503). Por favor, tente novamente em alguns instantes.",
        };
      } else if (process.env.NODE_ENV !== "production") {
        message = { message: errStr };
      }
    }

    const requestId = request.id?.toString();
    this.logger.error(
      {
        event: "http.request.failed",
        requestId,
        method: request.method,
        path: request.path,
        status,
        exceptionType:
          exception instanceof Error ? exception.constructor.name : "Unknown",
      },
      "HTTP request failed",
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.path,
      error: typeof message === "object" ? message : { message },
    });
  }
}

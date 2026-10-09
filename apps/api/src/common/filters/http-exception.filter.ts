import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

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

    this.logger.error(
      `HTTP ${status} on ${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.path,
      error: typeof message === "object" ? message : { message },
    });
  }
}

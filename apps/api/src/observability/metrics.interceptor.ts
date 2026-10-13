import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Request, Response } from "express";
import { Observable, catchError, tap, throwError } from "rxjs";
import { MetricsService } from "./metrics.service";

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const startedAt = performance.now();
    const route = this.getRoute(request);
    let recorded = false;

    this.metrics.startRequest();

    const record = (status: number): void => {
      if (recorded) return;
      recorded = true;
      this.metrics.finishRequest(
        request.method,
        route,
        status,
        performance.now() - startedAt,
      );
    };

    return next.handle().pipe(
      tap(() => record(response.statusCode)),
      catchError((error: unknown) => {
        const status =
          typeof error === "object" &&
          error !== null &&
          "getStatus" in error &&
          typeof error.getStatus === "function"
            ? error.getStatus()
            : 500;
        record(status);
        return throwError(() => error);
      }),
    );
  }

  private getRoute(request: Request): string {
    const route = request.route?.path;
    if (typeof route === "string") {
      return route;
    }

    return request.path.replace(
      /\/([0-9a-f]{8}-[0-9a-f-]{27,}|[0-9a-f]{16,})/gi,
      "/:id",
    );
  }
}

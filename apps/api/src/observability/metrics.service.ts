import { Injectable } from "@nestjs/common";
import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from "@prometheus-io/client";

export type MetricStatus = "success" | "error";

@Injectable()
export class MetricsService {
  readonly registry = new Registry();

  private readonly httpRequests = new Counter({
    name: "tailored_cv_http_requests_total",
    help: "Total number of HTTP requests handled by the API",
    labelNames: ["method", "route", "status"] as const,
    registers: [this.registry],
  });

  private readonly httpDuration = new Histogram({
    name: "tailored_cv_http_request_duration_seconds",
    help: "HTTP request duration in seconds",
    labelNames: ["method", "route", "status"] as const,
    buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30],
    registers: [this.registry],
  });

  private readonly aiRequests = new Counter({
    name: "tailored_cv_ai_requests_total",
    help: "Total number of AI provider requests",
    labelNames: ["operation", "provider", "status"] as const,
    registers: [this.registry],
  });

  private readonly aiDuration = new Histogram({
    name: "tailored_cv_ai_request_duration_seconds",
    help: "AI provider request duration in seconds",
    labelNames: ["operation", "provider", "status"] as const,
    buckets: [1, 2, 5, 10, 20, 30, 60, 120],
    registers: [this.registry],
  });

  private readonly activeRequests = new Gauge({
    name: "tailored_cv_http_active_requests",
    help: "Number of HTTP requests currently being processed",
    registers: [this.registry],
  });

  constructor() {
    collectDefaultMetrics({ register: this.registry, prefix: "tailored_cv_" });
  }

  startRequest(): void {
    this.activeRequests.inc();
  }

  finishRequest(
    method: string,
    route: string,
    status: number,
    durationMs: number,
  ): void {
    const labels = { method, route, status: String(status) };
    this.httpRequests.inc(labels);
    this.httpDuration.observe(labels, durationMs / 1000);
    this.activeRequests.dec();
  }

  recordAIRequest(
    operation: string,
    provider: string,
    status: MetricStatus,
    durationMs: number,
  ): void {
    const labels = { operation, provider, status };
    this.aiRequests.inc(labels);
    this.aiDuration.observe(labels, durationMs / 1000);
  }

  get contentType(): string {
    return this.registry.contentType;
  }

  getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}

import { Controller, Get, Res } from "@nestjs/common";
import type { Response } from "express";
import { Public } from "../common/decorators/public.decorator";
import { MetricsService } from "./metrics.service";

@Public()
@Controller("metrics")
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  async getMetrics(@Res() response: Response): Promise<void> {
    response
      .setHeader("Content-Type", this.metrics.contentType)
      .setHeader("Cache-Control", "no-store")
      .send(await this.metrics.getMetrics());
  }
}

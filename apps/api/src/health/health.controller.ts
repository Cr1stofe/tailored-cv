import { Controller, Get, Query } from "@nestjs/common";
import { HealthService } from "./health.service";
import { HealthResponseDto } from "./health.dto";
import { Public } from "../common/decorators/public.decorator";
import type { AIHealthStatus } from "@tailored-cv/types";

@Public()
@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async getHealth(
    @Query("detailed") detailed?: string,
  ): Promise<HealthResponseDto> {
    const isDetailed = detailed === "true";
    return this.healthService.check(isDetailed);
  }

  @Get("ai")
  async getAiHealth(): Promise<AIHealthStatus> {
    return this.healthService.checkAi();
  }
}

import { Controller, Get, Query } from "@nestjs/common";
import { HealthService } from "./health.service";
import { HealthResponseDto } from "./health.dto";
import { Public } from "../common/decorators/public.decorator";
import type { AIHealthStatus } from "@tailored-cv/types";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

@Public()
@Controller("health")
@ApiTags("Health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: "Check API health" })
  async getHealth(
    @Query("detailed") detailed?: string,
  ): Promise<HealthResponseDto> {
    const isDetailed = detailed === "true";
    return this.healthService.check(isDetailed);
  }

  @Get("ai")
  @ApiOperation({ summary: "Check AI provider health" })
  async getAiHealth(): Promise<AIHealthStatus> {
    return this.healthService.checkAi();
  }

  @Get("ready")
  @ApiOperation({ summary: "Check API and database readiness" })
  async getReadiness(): Promise<HealthResponseDto> {
    return this.healthService.checkReadiness();
  }
}

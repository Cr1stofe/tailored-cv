import { Injectable } from "@nestjs/common";
import { HealthResponseDto } from "./health.dto";
import { PrismaService } from "../prisma/prisma.service";
import { AIService } from "../ai/ai.service";
import type { AIHealthStatus } from "@tailored-cv/types";

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
  ) {}

  async check(detailed = false): Promise<HealthResponseDto> {
    if (!detailed) {
      return {
        status: (await this.prisma.isHealthy()) ? "ok" : "error",
        service: "tailored-cv-api",
      };
    }

    const isDbHealthy = await this.prisma.isHealthy();
    const aiStatus = await this.aiService.checkHealth();

    const isOverallHealthy = isDbHealthy && aiStatus.status === "connected";

    return {
      status: isOverallHealthy ? "ok" : "error",
      service: "tailored-cv-api",
      timestamp: new Date().toISOString(),
      database: isDbHealthy ? "connected" : "disconnected",
      ai: aiStatus,
    };
  }

  async checkReadiness(): Promise<HealthResponseDto> {
    const isDbHealthy = await this.prisma.isHealthy();
    return {
      status: isDbHealthy ? "ok" : "error",
      service: "tailored-cv-api",
      timestamp: new Date().toISOString(),
      database: isDbHealthy ? "connected" : "disconnected",
    };
  }

  async checkAi(): Promise<AIHealthStatus> {
    return this.aiService.checkHealth();
  }
}

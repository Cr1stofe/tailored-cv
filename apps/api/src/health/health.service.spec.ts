import { describe, it, expect, beforeEach } from "vitest";
import { HealthService } from "./health.service";
import { PrismaService } from "../prisma/prisma.service";
import { AIService } from "../ai/ai.service";

describe("HealthService", () => {
  let healthService: HealthService;
  let mockPrismaService: Partial<PrismaService>;
  let mockAiService: Partial<AIService>;

  beforeEach(() => {
    mockPrismaService = {
      isHealthy: async () => true,
    };
    mockAiService = {
      checkHealth: async () => ({
        status: "connected",
        provider: "mock",
        tokensConsumed: 0,
        latencyMs: 1,
      }),
    };
    healthService = new HealthService(
      mockPrismaService as PrismaService,
      mockAiService as AIService,
    );
  });

  it("should return standard status response", async () => {
    const response = await healthService.check(false);
    expect(response).toEqual({
      status: "ok",
      service: "tailored-cv-api",
    });
  });

  it("should return detailed status response when requested", async () => {
    const response = await healthService.check(true);
    expect(response.status).toBe("ok");
    expect(response.service).toBe("tailored-cv-api");
    expect(response.database).toBe("connected");
    expect(response.timestamp).toBeDefined();
  });

  it("should report database readiness independently from the AI provider", async () => {
    const response = await healthService.checkReadiness();
    expect(response.status).toBe("ok");
    expect(response.database).toBe("connected");
  });
});

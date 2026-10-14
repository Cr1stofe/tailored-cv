import { describe, expect, it, vi } from "vitest";
import type { AIService } from "../ai/ai.service";
import type { ProfileService } from "../profile/profile.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  AnalysisGenerationRecord,
  AnalysisGenerationService,
} from "./analysis-generation.service";

function generation(
  overrides: Partial<AnalysisGenerationRecord> = {},
): AnalysisGenerationRecord {
  return {
    id: "generation-1",
    applicationId: "application-1",
    status: "QUEUED",
    attempts: 0,
    errorMessage: null,
    analysisId: null,
    availableAt: new Date("2026-01-01T00:00:00.000Z"),
    startedAt: null,
    completedAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("AnalysisGenerationService", () => {
  it("creates a queued analysis and returns immediately", async () => {
    const created = generation();
    const create = vi.fn().mockResolvedValue(created);
    const prisma = {
      jobApplication: {
        findUnique: vi.fn().mockResolvedValue({ id: "application-1" }),
      },
      analysisGeneration: {
        findFirst: vi.fn(),
        create,
      },
      tailoringGeneration: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      $transaction: vi.fn(async (callback) =>
        callback({
          $queryRaw: vi.fn(),
          analysisGeneration: {
            findFirst: vi.fn().mockResolvedValue(null),
            create,
          },
          tailoringGeneration: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
        }),
      ),
    } as unknown as PrismaService;

    const service = new AnalysisGenerationService(
      prisma,
      {} as ProfileService,
      {} as AIService,
    );

    const result = await service.enqueue("application-1");

    expect(result).toMatchObject({
      id: "generation-1",
      status: "QUEUED",
    });
    expect(create).toHaveBeenCalledWith({
      data: { applicationId: "application-1" },
    });
  });

  it("reuses an active analysis instead of creating a duplicate", async () => {
    const active = generation({ status: "PROCESSING", attempts: 1 });
    const create = vi.fn();
    const prisma = {
      jobApplication: {
        findUnique: vi.fn().mockResolvedValue({ id: "application-1" }),
      },
      analysisGeneration: {
        findFirst: vi.fn().mockResolvedValue(active),
        create,
      },
      tailoringGeneration: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      $transaction: vi.fn(async (callback) =>
        callback({
          $queryRaw: vi.fn(),
          analysisGeneration: {
            findFirst: vi.fn().mockResolvedValue(active),
            create,
          },
          tailoringGeneration: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
        }),
      ),
    } as unknown as PrismaService;

    const service = new AnalysisGenerationService(
      prisma,
      {} as ProfileService,
      {} as AIService,
    );

    const result = await service.enqueue("application-1");

    expect(result.status).toBe("PROCESSING");
    expect(create).not.toHaveBeenCalled();
  });

  it("returns the latest analysis generation status", async () => {
    const completed = generation({
      status: "COMPLETED",
      attempts: 1,
      analysisId: "analysis-1",
      completedAt: new Date("2026-01-01T00:01:00.000Z"),
    });
    const prisma = {
      jobApplication: {
        findUnique: vi.fn().mockResolvedValue({ id: "application-1" }),
      },
      analysisGeneration: {
        findFirst: vi.fn().mockResolvedValue(completed),
      },
    } as unknown as PrismaService;

    const service = new AnalysisGenerationService(
      prisma,
      {} as ProfileService,
      {} as AIService,
    );

    const result = await service.getStatus("application-1");

    expect(result).toMatchObject({
      status: "COMPLETED",
      analysisId: "analysis-1",
      attempts: 1,
    });
  });

  it("returns IDLE when no analysis generation exists", async () => {
    const prisma = {
      jobApplication: {
        findUnique: vi.fn().mockResolvedValue({ id: "application-1" }),
      },
      analysisGeneration: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaService;

    const service = new AnalysisGenerationService(
      prisma,
      {} as ProfileService,
      {} as AIService,
    );

    await expect(service.getStatus("application-1")).resolves.toMatchObject({
      id: null,
      applicationId: "application-1",
      status: "IDLE",
      attempts: 0,
    });
  });

  it("only advances a draft application after analysis completes", async () => {
    const generationRecord = generation({ attempts: 1 });
    const updateMany = vi.fn();
    const prisma = {
      jobApplication: {
        findUnique: vi.fn().mockResolvedValue({
          id: "application-1",
          company: "Acme",
          position: "Engineer",
          jobDescription: "Build reliable software.",
        }),
      },
      jobAnalysis: {
        upsert: vi.fn().mockResolvedValue({ id: "analysis-1" }),
      },
      analysisGeneration: {
        update: vi.fn(),
      },
      $transaction: vi.fn(async (callback) =>
        callback({
          jobAnalysis: {
            upsert: vi.fn().mockResolvedValue({ id: "analysis-1" }),
          },
          analysisGeneration: { update: vi.fn() },
          jobApplication: { updateMany },
        }),
      ),
    } as unknown as PrismaService;
    const aiService = {
      analyzeJob: vi.fn().mockResolvedValue({
        summary: "Good fit",
        seniorityLevel: "Mid",
        requiredSkills: [],
        desiredSkills: [],
        keyResponsibilities: [],
        keywords: [],
        matchScore: 80,
        matchingSkills: [],
        missingSkills: [],
        strategicRecommendations: [],
      }),
    } as unknown as AIService;
    const service = new AnalysisGenerationService(
      prisma,
      {
        getProfile: vi.fn().mockResolvedValue({}),
      } as unknown as ProfileService,
      aiService,
    );

    await (
      service as unknown as {
        processGeneration: (record: AnalysisGenerationRecord) => Promise<void>;
      }
    ).processGeneration(generationRecord);

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "application-1", status: "DRAFT" },
      data: { status: "ANALYZED" },
    });
  });

  it("rejects analysis when tailoring is active under the application lock", async () => {
    const prisma = {
      jobApplication: {
        findUnique: vi.fn().mockResolvedValue({ id: "application-1" }),
      },
      $transaction: vi.fn(async (callback) =>
        callback({
          $queryRaw: vi.fn(),
          tailoringGeneration: {
            findFirst: vi.fn().mockResolvedValue({ id: "tailoring-1" }),
          },
          analysisGeneration: { findFirst: vi.fn() },
        }),
      ),
    } as unknown as PrismaService;
    const service = new AnalysisGenerationService(
      prisma,
      {} as ProfileService,
      {} as AIService,
    );

    await expect(service.enqueue("application-1")).rejects.toThrow(
      "A resume tailoring job is already running",
    );
  });

  it("requeues every processing analysis after startup", async () => {
    const updateMany = vi.fn();
    const prisma = {
      analysisGeneration: { updateMany },
    } as unknown as PrismaService;
    const service = new AnalysisGenerationService(
      prisma,
      {} as ProfileService,
      {} as AIService,
    );

    await (
      service as unknown as {
        recoverStaleGenerations: () => Promise<void>;
      }
    ).recoverStaleGenerations();

    expect(updateMany).toHaveBeenCalledWith({
      where: { status: "PROCESSING" },
      data: expect.objectContaining({
        status: "QUEUED",
        errorMessage: "Análise retomada após reinício do serviço.",
      }),
    });
  });
});

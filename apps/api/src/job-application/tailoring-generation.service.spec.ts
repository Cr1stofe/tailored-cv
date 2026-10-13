import { describe, expect, it, vi } from "vitest";
import type { ProfileService } from "../profile/profile.service";
import type { AIService } from "../ai/ai.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  TailoringGenerationRecord,
  TailoringGenerationService,
} from "./tailoring-generation.service";

function generation(
  overrides: Partial<TailoringGenerationRecord> = {},
): TailoringGenerationRecord {
  return {
    id: "generation-1",
    applicationId: "application-1",
    targetLanguage: "PT",
    status: "QUEUED",
    attempts: 0,
    errorMessage: null,
    resumeId: null,
    availableAt: new Date("2026-01-01T00:00:00.000Z"),
    startedAt: null,
    completedAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("TailoringGenerationService", () => {
  it("creates a queued generation and returns immediately", async () => {
    const created = generation();
    const create = vi.fn().mockResolvedValue(created);
    const prisma = {
      jobApplication: {
        findUnique: vi.fn().mockResolvedValue({
          id: "application-1",
          targetLanguage: "PT",
        }),
      },
      tailoringGeneration: {
        findFirst: vi.fn(),
        create,
      },
      analysisGeneration: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      $transaction: vi.fn(async (callback) =>
        callback({
          $queryRaw: vi.fn(),
          analysisGeneration: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
          tailoringGeneration: {
            findFirst: vi.fn().mockResolvedValue(null),
            create,
          },
        }),
      ),
    } as unknown as PrismaService;

    const service = new TailoringGenerationService(
      prisma,
      {} as ProfileService,
      {} as AIService,
    );

    const result = await service.enqueue("application-1", "PT");

    expect(result).toMatchObject({
      id: "generation-1",
      status: "QUEUED",
      targetLanguage: "PT",
    });
    expect(create).toHaveBeenCalledWith({
      data: { applicationId: "application-1", targetLanguage: "PT" },
    });
  });

  it("reuses an active generation instead of creating a duplicate", async () => {
    const active = generation({ status: "PROCESSING", attempts: 1 });
    const create = vi.fn();
    const prisma = {
      jobApplication: {
        findUnique: vi.fn().mockResolvedValue({
          id: "application-1",
          targetLanguage: "PT",
        }),
      },
      tailoringGeneration: {
        findFirst: vi.fn().mockResolvedValue(active),
        create,
      },
      analysisGeneration: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      $transaction: vi.fn(async (callback) =>
        callback({
          $queryRaw: vi.fn(),
          analysisGeneration: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
          tailoringGeneration: {
            findFirst: vi.fn().mockResolvedValue(active),
            create,
          },
        }),
      ),
    } as unknown as PrismaService;

    const service = new TailoringGenerationService(
      prisma,
      {} as ProfileService,
      {} as AIService,
    );

    const result = await service.enqueue("application-1", "PT");

    expect(result.status).toBe("PROCESSING");
    expect(create).not.toHaveBeenCalled();
  });

  it("returns the latest generation for the requested language", async () => {
    const completed = generation({
      status: "COMPLETED",
      attempts: 1,
      resumeId: "resume-1",
      completedAt: new Date("2026-01-01T00:01:00.000Z"),
    });
    const prisma = {
      jobApplication: {
        findUnique: vi.fn().mockResolvedValue({
          id: "application-1",
          targetLanguage: "EN",
        }),
      },
      tailoringGeneration: {
        findFirst: vi.fn().mockResolvedValue(completed),
      },
    } as unknown as PrismaService;

    const service = new TailoringGenerationService(
      prisma,
      {} as ProfileService,
      {} as AIService,
    );

    const result = await service.getStatus("application-1", "EN");

    expect(result).toMatchObject({
      status: "COMPLETED",
      resumeId: "resume-1",
      attempts: 1,
    });
  });

  it("does not regress an advanced application status after tailoring", async () => {
    const generationRecord = generation({ attempts: 1 });
    const statusUpdate = vi.fn();
    const languageUpdate = vi.fn();
    const prisma = {
      jobApplication: {
        findUnique: vi.fn().mockResolvedValue({
          id: "application-1",
          company: "Acme",
          position: "Engineer",
          jobDescription: "Build reliable software.",
          jobAnalysis: null,
        }),
      },
      tailoredResume: {
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockResolvedValue({ id: "resume-1" }),
      },
      tailoringGeneration: {
        update: vi.fn(),
      },
      $transaction: vi.fn(async (callback) =>
        callback({
          tailoredResume: {
            count: vi.fn().mockResolvedValue(0),
            create: vi.fn().mockResolvedValue({ id: "resume-1" }),
          },
          tailoringGeneration: { update: vi.fn() },
          jobApplication: {
            updateMany: vi
              .fn()
              .mockImplementationOnce(statusUpdate)
              .mockImplementationOnce(languageUpdate),
          },
        }),
      ),
    } as unknown as PrismaService;
    const aiService = {
      tailorResume: vi.fn().mockResolvedValue({
        title: "Engineer",
        targetedHeadline: "Engineer",
        reframedSummary: "Reliable software engineer.",
        highlightedSkills: [],
        tailoredExperiences: [],
        tailoredProjects: [],
        generationReport: {
          highlighted: [],
          removed: [],
          uncovered_requirements: [],
          match_score: 80,
          match_explanation: "Good fit",
          warnings: [],
        },
      }),
    } as unknown as AIService;
    const service = new TailoringGenerationService(
      prisma,
      {
        getProfile: vi.fn().mockResolvedValue({}),
      } as unknown as ProfileService,
      aiService,
    );

    await (
      service as unknown as {
        processGeneration: (record: TailoringGenerationRecord) => Promise<void>;
      }
    ).processGeneration(generationRecord);

    expect(statusUpdate).toHaveBeenCalledWith({
      where: {
        id: "application-1",
        status: { in: ["DRAFT", "ANALYZED", "TAILORED"] },
      },
      data: { status: "TAILORED" },
    });
    expect(languageUpdate).toHaveBeenCalledWith({
      where: { id: "application-1" },
      data: { targetLanguage: "PT" },
    });
  });

  it("rejects tailoring when analysis is active under the application lock", async () => {
    const prisma = {
      jobApplication: {
        findUnique: vi.fn().mockResolvedValue({
          id: "application-1",
          targetLanguage: "PT",
        }),
      },
      $transaction: vi.fn(async (callback) =>
        callback({
          $queryRaw: vi.fn(),
          analysisGeneration: {
            findFirst: vi.fn().mockResolvedValue({ id: "analysis-1" }),
          },
          tailoringGeneration: { findFirst: vi.fn() },
        }),
      ),
    } as unknown as PrismaService;
    const service = new TailoringGenerationService(
      prisma,
      {} as ProfileService,
      {} as AIService,
    );

    await expect(service.enqueue("application-1", "PT")).rejects.toThrow(
      "A job analysis is already running",
    );
  });

  it("requeues every processing tailoring job after startup", async () => {
    const updateMany = vi.fn();
    const prisma = {
      tailoringGeneration: { updateMany },
    } as unknown as PrismaService;
    const service = new TailoringGenerationService(
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
        errorMessage: "Geração retomada após reinício do serviço.",
      }),
    });
  });
});

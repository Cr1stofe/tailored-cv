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
    const prisma = {
      jobApplication: {
        findUnique: vi.fn().mockResolvedValue({
          id: "application-1",
          targetLanguage: "PT",
        }),
      },
      tailoringGeneration: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(created),
      },
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
    expect(prisma.tailoringGeneration.create).toHaveBeenCalledWith({
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
});

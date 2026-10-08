import { describe, it, expect, beforeEach } from "vitest";
import { JobApplicationService } from "./job-application.service";
import { PrismaService } from "../prisma/prisma.service";
import { ProfileService } from "../profile/profile.service";
import { AIService } from "../ai/ai.service";
import { ConfigService } from "@nestjs/config";
import { MasterProfileDto } from "@tailored-cv/types";

describe("JobApplicationService", () => {
  let service: JobApplicationService;
  let mockPrisma: Partial<PrismaService>;
  let mockProfileService: Partial<ProfileService>;
  let aiService: AIService;

  const mockProfile: MasterProfileDto = {
    id: "mock-profile-id",
    fullName: "John Doe",
    email: "john.doe@example.com",
    summary: "Senior Full Stack Engineer",
    skills: [{ name: "TypeScript", category: "PROFESSIONAL" }],
    experiences: [],
    projects: [],
    educations: [],
    certifications: [],
  };

  beforeEach(() => {
    mockPrisma = {
      jobApplication: {
        findMany: async () => [],
        findUnique: async () => null,
        create: async (args: { data: Record<string, unknown> }) => ({
          id: "app-1",
          profileId: args.data["profileId"] as string,
          company: args.data["company"] as string,
          position: args.data["position"] as string,
          location: (args.data["location"] as string) || null,
          url: (args.data["url"] as string) || null,
          jobDescription: args.data["jobDescription"] as string,
          status: "DRAFT",
          createdAt: new Date(),
          updatedAt: new Date(),
          jobAnalysis: null,
          tailoredResumes: [],
        }),
        delete: async () => ({ id: "app-1" }) as never,
        update: async (args: {
          where: { id: string };
          data: { status: string };
        }) =>
          ({
            id: args.where.id,
            status: args.data.status,
            createdAt: new Date(),
            updatedAt: new Date(),
          }) as never,
      } as unknown as PrismaService["jobApplication"],
    };

    mockProfileService = {
      getProfile: async () => mockProfile,
    };

    aiService = new AIService(new ConfigService());
    service = new JobApplicationService(
      mockPrisma as PrismaService,
      mockProfileService as ProfileService,
      aiService,
    );
  });

  it("should create a job application linked to master profile", async () => {
    const result = await service.create({
      company: "Acme Inc",
      position: "Staff Engineer",
      jobDescription: "Vaga de Staff Engineer com foco em arquitetura.",
      targetLanguage: "PT",
    });

    expect(result).toBeDefined();
    expect(result.company).toBe("Acme Inc");
    expect(result.status).toBe("DRAFT");
    expect(result.profileId).toBe("mock-profile-id");
  });
});

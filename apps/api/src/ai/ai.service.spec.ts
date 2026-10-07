import { describe, it, expect, beforeEach } from "vitest";
import { AIService } from "./ai.service";
import { ConfigService } from "@nestjs/config";
import { MasterProfileDto } from "@tailored-cv/types";

describe("AIService", () => {
  let aiService: AIService;

  const mockProfile: MasterProfileDto = {
    fullName: "John Doe",
    email: "john.doe@example.com",
    summary: "Senior Full Stack Engineer",
    skills: [
      { name: "TypeScript", category: "PROFESSIONAL" },
      { name: "React 19", category: "PROFESSIONAL" },
      { name: "NestJS", category: "PROFESSIONAL" },
    ],
    experiences: [
      {
        company: "Tech Enterprise",
        position: "Senior Engineer",
        startDate: "2023-01",
        isCurrent: true,
        technologies: ["TypeScript", "NestJS"],
        highlights: [
          "Desenvolveu microsserviços em NestJS com alta performance.",
        ],
      },
    ],
    projects: [],
    educations: [],
    certifications: [],
  };

  beforeEach(() => {
    const configService = new ConfigService();
    aiService = new AIService(configService);
  });

  it("should analyze job description and calculate match score", async () => {
    const result = await aiService.analyzeJob({
      company: "TechCorp",
      position: "Senior NestJS Developer",
      jobDescription:
        "Vaga para desenvolvedor sênior com experiência em TypeScript e NestJS.",
      masterProfile: mockProfile,
    });

    expect(result).toBeDefined();
    expect(result.summary).toContain("TechCorp");
    expect(result.matchScore).toBeGreaterThanOrEqual(50);
    expect(result.matchingSkills).toContain("TypeScript");
  });

  it("should tailor resume respecting anti-hallucination principle", async () => {
    const result = await aiService.tailorResume({
      company: "TechCorp",
      position: "Senior NestJS Developer",
      jobDescription:
        "Vaga para desenvolvedor sênior com experiência em TypeScript e NestJS.",
      masterProfile: mockProfile,
    });

    expect(result).toBeDefined();
    expect(result.targetedHeadline).toBeDefined();
    expect(result.tailoredExperiences).toHaveLength(1);
    expect(result.tailoredExperiences[0]?.company).toBe("Tech Enterprise");
  });
});

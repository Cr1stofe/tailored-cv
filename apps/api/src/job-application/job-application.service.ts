import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ProfileService } from "../profile/profile.service";
import {
  ApplicationStatus,
  JobApplicationDto,
  TailoredResumeDto,
  TailoredExperienceItem,
  TailoredProjectItem,
  TailoringReport,
  SupportedLanguage,
  PaginatedResult,
  JobApplicationFiltersDto,
  TailoringGenerationDto,
  AnalysisGenerationDto,
  CoverLetterFocus,
} from "@tailored-cv/types";
import {
  CreateJobApplicationInput,
  localizeResumeProjectName,
} from "@tailored-cv/validation";
import { Prisma } from "@prisma/client";
import { TailoringGenerationService } from "./tailoring-generation.service";
import { AnalysisGenerationService } from "./analysis-generation.service";
import { CoverLetterGenerationService } from "./cover-letter-generation.service";

@Injectable()
export class JobApplicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profileService: ProfileService,
    private readonly tailoringGenerationService?: TailoringGenerationService,
    private readonly analysisGenerationService?: AnalysisGenerationService,
    private readonly coverLetterGenerationService?: CoverLetterGenerationService,
  ) {}

  async findAll(
    filters?: JobApplicationFiltersDto,
  ): Promise<PaginatedResult<JobApplicationDto>> {
    const page = Math.max(1, Number(filters?.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(filters?.limit) || 12));
    const skip = (page - 1) * limit;

    const where: Prisma.JobApplicationWhereInput = {};

    if (filters?.status && (filters.status as string) !== "ALL") {
      where.status = filters.status;
    }

    const conditions: Prisma.JobApplicationWhereInput[] = [];

    if (filters?.search?.trim()) {
      const search = filters.search.trim();
      conditions.push({
        OR: [
          { position: { contains: search, mode: "insensitive" } },
          { company: { contains: search, mode: "insensitive" } },
          { location: { contains: search, mode: "insensitive" } },
          { jobDescription: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    if (filters?.stack && filters.stack !== "ALL") {
      const stackKeywords: Record<string, string[]> = {
        FULLSTACK: ["full stack", "fullstack", "full-stack"],
        FRONTEND: [
          "frontend",
          "front-end",
          "react",
          "next.js",
          "vue",
          "angular",
        ],
        BACKEND: [
          "backend",
          "back-end",
          "node",
          "nestjs",
          "java",
          "python",
          "golang",
          "c#",
        ],
        MOBILE: ["mobile", "flutter", "react native", "ios", "android"],
        DEVOPS: ["devops", "cloud", "aws", "docker", "kubernetes"],
      };

      const keywords = stackKeywords[filters.stack];
      if (keywords) {
        conditions.push({
          OR: keywords.flatMap((kw) => [
            { position: { contains: kw, mode: "insensitive" } },
            { jobDescription: { contains: kw, mode: "insensitive" } },
          ]),
        });
      }
    }

    if (conditions.length > 0) {
      where.AND = conditions;
    }

    let orderBy: Prisma.JobApplicationOrderByWithRelationInput;

    switch (filters?.sortBy) {
      case "oldest":
        orderBy = { createdAt: "asc" };
        break;
      case "company_asc":
        orderBy = { company: "asc" };
        break;
      case "match_desc":
        orderBy = { jobAnalysis: { matchScore: "desc" } };
        break;
      case "match_asc":
        orderBy = { jobAnalysis: { matchScore: "asc" } };
        break;
      case "newest":
      default:
        orderBy = { createdAt: "desc" };
        break;
    }

    const [list, total] = await Promise.all([
      this.prisma.jobApplication.findMany({
        where,
        include: {
          jobAnalysis: true,
          tailoredResumes: { orderBy: { version: "desc" }, take: 1 },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.jobApplication.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: list.map((item) => this.mapApplication(item)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findById(id: string): Promise<JobApplicationDto> {
    const item = await this.prisma.jobApplication.findUnique({
      where: { id },
      include: {
        jobAnalysis: true,
        tailoredResumes: { orderBy: { version: "desc" } },
      },
    });

    if (!item) {
      throw new NotFoundException(`Job application ${id} not found`);
    }

    return this.mapApplication(item);
  }

  async create(data: CreateJobApplicationInput): Promise<JobApplicationDto> {
    const profile = await this.profileService.getProfile();

    const created = await this.prisma.jobApplication.create({
      data: {
        profileId: profile.id!,
        company: data.company,
        position: data.position,
        location: data.location,
        url: data.url,
        jobDescription: data.jobDescription,
        targetLanguage: data.targetLanguage || "PT",
        status: "DRAFT",
      },
      include: {
        jobAnalysis: true,
        tailoredResumes: true,
      },
    });

    return this.mapApplication(created);
  }

  async delete(id: string): Promise<{ success: boolean }> {
    await this.prisma.jobApplication.delete({
      where: { id },
    });
    return { success: true };
  }

  async updateStatus(
    id: string,
    status: ApplicationStatus,
  ): Promise<JobApplicationDto> {
    const updated = await this.prisma.jobApplication.update({
      where: { id },
      data: { status },
      include: {
        jobAnalysis: true,
        tailoredResumes: true,
      },
    });

    return this.mapApplication(updated);
  }

  async analyze(id: string): Promise<AnalysisGenerationDto> {
    if (!this.analysisGenerationService) {
      throw new Error("Analysis generation service is not configured");
    }

    return this.analysisGenerationService.enqueue(id);
  }

  async getAnalysisStatus(id: string): Promise<AnalysisGenerationDto> {
    if (!this.analysisGenerationService) {
      throw new Error("Analysis generation service is not configured");
    }

    return this.analysisGenerationService.getStatus(id);
  }

  async tailor(
    id: string,
    options?: { targetLanguage?: SupportedLanguage },
  ): Promise<TailoringGenerationDto> {
    if (!this.tailoringGenerationService) {
      throw new Error("Tailoring generation service is not configured");
    }

    return this.tailoringGenerationService.enqueue(id, options?.targetLanguage);
  }

  async getTailoringStatus(
    id: string,
    targetLanguage?: SupportedLanguage,
  ): Promise<TailoringGenerationDto> {
    if (!this.tailoringGenerationService) {
      throw new Error("Tailoring generation service is not configured");
    }

    return this.tailoringGenerationService.getStatus(id, targetLanguage);
  }

  async getTailoredResume(applicationId: string): Promise<TailoredResumeDto> {
    const resume = await this.prisma.tailoredResume.findFirst({
      where: { applicationId },
      orderBy: { version: "desc" },
    });

    if (!resume) {
      throw new NotFoundException(
        `No tailored resume found for application ${applicationId}`,
      );
    }

    return {
      id: resume.id,
      applicationId: resume.applicationId,
      version: resume.version,
      title: resume.title,
      language: (resume.language as SupportedLanguage) || "PT",
      targetedHeadline: resume.targetedHeadline,
      reframedSummary: resume.reframedSummary,
      highlightedSkills: resume.highlightedSkills,
      tailoredExperiences:
        resume.tailoredExperiences as unknown as TailoredExperienceItem[],
      tailoredProjects: this.mapTailoredProjects(
        resume.tailoredProjects,
        resume.language,
      ),
      generationReport: this.mapGenerationReport(resume.generationReport),
      createdAt: resume.createdAt.toISOString(),
      updatedAt: resume.updatedAt.toISOString(),
    };
  }

  async enqueueCoverLetter(
    applicationId: string,
    options: { targetLanguage?: SupportedLanguage; focus: CoverLetterFocus },
  ) {
    if (!this.coverLetterGenerationService) {
      throw new Error("Cover letter generation service is not configured");
    }

    return this.coverLetterGenerationService.enqueue(applicationId, options);
  }

  async getCoverLetterStatus(
    applicationId: string,
    options: { targetLanguage?: SupportedLanguage; focus: CoverLetterFocus },
  ) {
    if (!this.coverLetterGenerationService) {
      throw new Error("Cover letter generation service is not configured");
    }

    return this.coverLetterGenerationService.getStatus(applicationId, options);
  }

  async updateTailoredResume(
    applicationId: string,
    data: {
      resumeId?: string;
      targetedHeadline?: string | null;
      reframedSummary?: string;
      highlightedSkills?: string[];
      tailoredExperiences?: TailoredExperienceItem[];
      tailoredProjects?: TailoredProjectItem[] | null;
    },
  ): Promise<TailoredResumeDto> {
    const latest = await this.prisma.tailoredResume.findFirst({
      where: {
        applicationId,
        ...(data.resumeId ? { id: data.resumeId } : {}),
      },
      orderBy: { version: "desc" },
    });

    if (!latest) {
      throw new NotFoundException(
        `Nenhum currículo adaptado encontrado para a vaga ${applicationId}`,
      );
    }

    const updated = await this.prisma.tailoredResume.update({
      where: { id: latest.id },
      data: {
        targetedHeadline:
          data.targetedHeadline !== undefined
            ? data.targetedHeadline
            : latest.targetedHeadline,
        reframedSummary:
          data.reframedSummary !== undefined
            ? data.reframedSummary
            : latest.reframedSummary,
        highlightedSkills:
          data.highlightedSkills !== undefined
            ? data.highlightedSkills
            : latest.highlightedSkills,
        tailoredExperiences:
          data.tailoredExperiences !== undefined
            ? (data.tailoredExperiences as unknown as Prisma.InputJsonValue)
            : (latest.tailoredExperiences as unknown as Prisma.InputJsonValue),
        tailoredProjects:
          data.tailoredProjects !== undefined
            ? data.tailoredProjects === null
              ? Prisma.JsonNull
              : (data.tailoredProjects as unknown as Prisma.InputJsonValue)
            : latest.tailoredProjects === null
              ? Prisma.JsonNull
              : (latest.tailoredProjects as unknown as Prisma.InputJsonValue),
      },
    });

    return {
      id: updated.id,
      applicationId: updated.applicationId,
      version: updated.version,
      title: updated.title,
      language: (updated.language as SupportedLanguage) || "PT",
      targetedHeadline: updated.targetedHeadline,
      reframedSummary: updated.reframedSummary,
      highlightedSkills: updated.highlightedSkills,
      tailoredExperiences:
        updated.tailoredExperiences as unknown as TailoredExperienceItem[],
      tailoredProjects: this.mapTailoredProjects(
        updated.tailoredProjects,
        updated.language,
      ),
      generationReport: this.mapGenerationReport(updated.generationReport),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  private mapTailoredProjects(
    value: Prisma.JsonValue | null,
    language?: string,
  ): TailoredProjectItem[] | null {
    if (!Array.isArray(value)) return null;
    const isEnglish = language === "EN";

    return value.map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return item;
      }
      const project = item as Prisma.JsonObject;
      return {
        ...project,
        name:
          typeof project.name === "string"
            ? localizeResumeProjectName(project.name, isEnglish)
            : project.name,
      };
    }) as unknown as TailoredProjectItem[];
  }

  private mapGenerationReport(value: Prisma.JsonValue | null): TailoringReport {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as unknown as TailoringReport;
    }
    return {
      highlighted: [],
      removed: [],
      uncovered_requirements: [],
      match_score: 0,
      match_explanation:
        "Relatório indisponível para esta versão anterior do currículo.",
      warnings: [
        "Currículo gerado antes da inclusão das validações de qualidade.",
      ],
    };
  }

  private mapApplication(item: {
    id: string;
    profileId: string;
    company: string;
    position: string;
    location: string | null;
    url: string | null;
    jobDescription: string;
    targetLanguage?: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    jobAnalysis?: {
      id: string;
      applicationId: string;
      summary: string;
      seniorityLevel: string | null;
      requiredSkills: string[];
      desiredSkills: string[];
      keyResponsibilities: string[];
      keywords: string[];
      matchScore: number;
      matchingSkills: string[];
      missingSkills: string[];
      strategicRecommendations: string[];
      createdAt: Date;
      updatedAt: Date;
    } | null;
    tailoredResumes?: {
      id: string;
      applicationId: string;
      version: number;
      title: string;
      language?: string;
      targetedHeadline: string | null;
      reframedSummary: string;
      highlightedSkills: string[];
      tailoredExperiences: Prisma.JsonValue;
      tailoredProjects: Prisma.JsonValue | null;
      generationReport: Prisma.JsonValue | null;
      createdAt: Date;
      updatedAt: Date;
    }[];
  }): JobApplicationDto {
    return {
      id: item.id,
      profileId: item.profileId,
      company: item.company,
      position: item.position,
      location: item.location,
      url: item.url,
      jobDescription: item.jobDescription,
      targetLanguage: (item.targetLanguage as SupportedLanguage) || "PT",
      status: item.status as ApplicationStatus,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      jobAnalysis: item.jobAnalysis
        ? {
            id: item.jobAnalysis.id,
            applicationId: item.jobAnalysis.applicationId,
            summary: item.jobAnalysis.summary,
            seniorityLevel: item.jobAnalysis.seniorityLevel,
            requiredSkills: item.jobAnalysis.requiredSkills,
            desiredSkills: item.jobAnalysis.desiredSkills,
            keyResponsibilities: item.jobAnalysis.keyResponsibilities,
            keywords: item.jobAnalysis.keywords,
            matchScore: item.jobAnalysis.matchScore,
            matchingSkills: item.jobAnalysis.matchingSkills,
            missingSkills: item.jobAnalysis.missingSkills,
            strategicRecommendations: item.jobAnalysis.strategicRecommendations,
            createdAt: item.jobAnalysis.createdAt.toISOString(),
            updatedAt: item.jobAnalysis.updatedAt.toISOString(),
          }
        : null,
      tailoredResumes: item.tailoredResumes?.map((r) => ({
        id: r.id,
        applicationId: r.applicationId,
        version: r.version,
        title: r.title,
        language: (r.language as SupportedLanguage) || "PT",
        targetedHeadline: r.targetedHeadline,
        reframedSummary: r.reframedSummary,
        highlightedSkills: r.highlightedSkills,
        tailoredExperiences:
          r.tailoredExperiences as unknown as TailoredExperienceItem[],
        tailoredProjects: this.mapTailoredProjects(
          r.tailoredProjects,
          r.language,
        ),
        generationReport: this.mapGenerationReport(r.generationReport),
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    };
  }
}

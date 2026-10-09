import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ProfileService } from "../profile/profile.service";
import { AIService } from "../ai/ai.service";
import {
  ApplicationStatus,
  JobApplicationDto,
  TailoredResumeDto,
  TailoredExperienceItem,
  TailoredProjectItem,
  SupportedLanguage,
  PaginatedResult,
  JobApplicationFiltersDto,
} from "@tailored-cv/types";
import {
  CreateJobApplicationInput,
  localizeResumeProjectName,
  sanitizeHeadline,
} from "@tailored-cv/validation";
import { Prisma } from "@prisma/client";

@Injectable()
export class JobApplicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profileService: ProfileService,
    private readonly aiService: AIService,
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

  async analyze(id: string) {
    const application = await this.findById(id);
    const masterProfile = await this.profileService.getProfile();

    const analysisOutput = await this.aiService.analyzeJob({
      company: application.company,
      position: application.position,
      jobDescription: application.jobDescription,
      masterProfile,
    });

    const savedAnalysis = await this.prisma.jobAnalysis.upsert({
      where: { applicationId: id },
      create: {
        applicationId: id,
        summary: analysisOutput.summary,
        seniorityLevel: analysisOutput.seniorityLevel,
        requiredSkills: analysisOutput.requiredSkills,
        desiredSkills: analysisOutput.desiredSkills,
        keyResponsibilities: analysisOutput.keyResponsibilities,
        keywords: analysisOutput.keywords,
        matchScore: analysisOutput.matchScore,
        matchingSkills: analysisOutput.matchingSkills,
        missingSkills: analysisOutput.missingSkills,
        strategicRecommendations: analysisOutput.strategicRecommendations,
      },
      update: {
        summary: analysisOutput.summary,
        seniorityLevel: analysisOutput.seniorityLevel,
        requiredSkills: analysisOutput.requiredSkills,
        desiredSkills: analysisOutput.desiredSkills,
        keyResponsibilities: analysisOutput.keyResponsibilities,
        keywords: analysisOutput.keywords,
        matchScore: analysisOutput.matchScore,
        matchingSkills: analysisOutput.matchingSkills,
        missingSkills: analysisOutput.missingSkills,
        strategicRecommendations: analysisOutput.strategicRecommendations,
      },
    });

    await this.prisma.jobApplication.update({
      where: { id },
      data: { status: "ANALYZED" },
    });

    return savedAnalysis;
  }

  async tailor(
    id: string,
    options?: { targetLanguage?: SupportedLanguage },
  ): Promise<TailoredResumeDto> {
    const application = await this.findById(id);
    const masterProfile = await this.profileService.getProfile();
    const targetLanguage: SupportedLanguage =
      options?.targetLanguage || application.targetLanguage || "PT";

    const tailorOutput = await this.aiService.tailorResume({
      company: application.company,
      position: application.position,
      jobDescription: application.jobDescription,
      // PT is the canonical source of facts for both languages. The model
      // translates the selected text, but must never receive a second profile
      // whose projects/experiences can drift from the original.
      masterProfile,
      jobAnalysis: application.jobAnalysis || undefined,
      targetLanguage,
    });

    const existingCount = await this.prisma.tailoredResume.count({
      where: { applicationId: id },
    });

    const createdResume = await this.prisma.tailoredResume.create({
      data: {
        applicationId: id,
        version: existingCount + 1,
        title: tailorOutput.title,
        language: targetLanguage,
        targetedHeadline: sanitizeHeadline(tailorOutput.targetedHeadline),
        reframedSummary: tailorOutput.reframedSummary,
        highlightedSkills: tailorOutput.highlightedSkills,
        tailoredExperiences:
          tailorOutput.tailoredExperiences as unknown as Prisma.InputJsonValue,
        tailoredProjects: tailorOutput.tailoredProjects
          ? (tailorOutput.tailoredProjects as unknown as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });

    await this.prisma.jobApplication.update({
      where: { id },
      data: {
        status: "TAILORED",
        targetLanguage,
      },
    });

    return {
      id: createdResume.id,
      applicationId: createdResume.applicationId,
      version: createdResume.version,
      title: createdResume.title,
      language: (createdResume.language as SupportedLanguage) || "PT",
      targetedHeadline: createdResume.targetedHeadline,
      reframedSummary: createdResume.reframedSummary,
      highlightedSkills: createdResume.highlightedSkills,
      tailoredExperiences:
        createdResume.tailoredExperiences as unknown as TailoredExperienceItem[],
      tailoredProjects: this.mapTailoredProjects(
        createdResume.tailoredProjects,
        targetLanguage,
      ),
      createdAt: createdResume.createdAt.toISOString(),
      updatedAt: createdResume.updatedAt.toISOString(),
    };
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
      createdAt: resume.createdAt.toISOString(),
      updatedAt: resume.updatedAt.toISOString(),
    };
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
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    };
  }
}

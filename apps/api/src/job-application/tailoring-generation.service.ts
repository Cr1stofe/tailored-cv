import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from "@nestjs/common";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";
import { Prisma } from "@prisma/client";
import type {
  JobAnalysisDto,
  SupportedLanguage,
  TailoringGenerationDto,
} from "@tailored-cv/types";
import { sanitizeHeadline } from "@tailored-cv/validation";
import { AIService } from "../ai/ai.service";
import { ProfileService } from "../profile/profile.service";
import { PrismaService } from "../prisma/prisma.service";

const POLL_INTERVAL_MS = 2_000;
const RETRY_DELAY_MS = 10_000;
const MAX_ATTEMPTS = 2;

export interface TailoringGenerationRecord {
  id: string;
  applicationId: string;
  targetLanguage: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  attempts: number;
  errorMessage: string | null;
  resumeId: string | null;
  availableAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class TailoringGenerationService
  implements OnModuleInit, OnModuleDestroy
{
  private processing = false;
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly profileService: ProfileService,
    private readonly aiService: AIService,
    @Optional()
    @InjectPinoLogger(TailoringGenerationService.name)
    private readonly logger?: PinoLogger,
  ) {}

  onModuleInit(): void {
    void this.recoverStaleGenerations().catch((error) => {
      this.logger?.error(
        {
          event: "tailoring.queue.recovery_failed",
          errorType:
            error instanceof Error ? error.constructor.name : "Unknown",
        },
        "Failed to recover stale tailoring generations",
      );
    });
    this.timer = setInterval(() => void this.processNext(), POLL_INTERVAL_MS);
    void this.processNext();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async enqueue(
    applicationId: string,
    targetLanguage?: SupportedLanguage,
  ): Promise<TailoringGenerationDto> {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException(`Job application ${applicationId} not found`);
    }

    const language =
      targetLanguage ||
      (application.targetLanguage as SupportedLanguage) ||
      "PT";
    const generation = await this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT "id"
        FROM "job_applications"
        WHERE "id" = ${applicationId}
        FOR UPDATE
      `;

      const activeAnalysis = await transaction.analysisGeneration.findFirst({
        where: {
          applicationId,
          status: { in: ["QUEUED", "PROCESSING"] },
        },
      });

      if (activeAnalysis) {
        throw new ConflictException(
          "A job analysis is already running for this application.",
        );
      }

      const active = await transaction.tailoringGeneration.findFirst({
        where: {
          applicationId,
          targetLanguage: language,
          status: { in: ["QUEUED", "PROCESSING"] },
        },
        orderBy: { createdAt: "desc" },
      });

      if (active) return active;

      return transaction.tailoringGeneration.create({
        data: { applicationId, targetLanguage: language },
      });
    });

    void this.processNext();
    return this.mapGeneration(generation);
  }

  async getStatus(
    applicationId: string,
    targetLanguage?: SupportedLanguage,
  ): Promise<TailoringGenerationDto> {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException(`Job application ${applicationId} not found`);
    }

    const language =
      targetLanguage ||
      (application.targetLanguage as SupportedLanguage) ||
      "PT";
    const generation = await this.prisma.tailoringGeneration.findFirst({
      where: { applicationId, targetLanguage: language },
      orderBy: { createdAt: "desc" },
    });

    if (!generation) {
      throw new NotFoundException(
        `No tailoring generation found for application ${applicationId}`,
      );
    }

    return this.mapGeneration(generation);
  }

  private async processNext(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      const next = await this.prisma.tailoringGeneration.findFirst({
        where: { status: "QUEUED", availableAt: { lte: new Date() } },
        orderBy: { createdAt: "asc" },
      });

      if (!next) return;

      const claimed = await this.prisma.tailoringGeneration.updateMany({
        where: { id: next.id, status: "QUEUED" },
        data: {
          status: "PROCESSING",
          attempts: { increment: 1 },
          startedAt: new Date(),
          errorMessage: null,
        },
      });

      if (claimed.count === 0) return;

      const generation = await this.prisma.tailoringGeneration.findUnique({
        where: { id: next.id },
      });

      if (generation) await this.processGeneration(generation);
    } catch (error) {
      this.logger?.error(
        {
          event: "tailoring.queue.failed",
          errorType:
            error instanceof Error ? error.constructor.name : "Unknown",
        },
        "Tailoring queue cycle failed",
      );
    } finally {
      this.processing = false;
    }
  }

  private async processGeneration(
    generation: TailoringGenerationRecord,
  ): Promise<void> {
    try {
      const application = await this.prisma.jobApplication.findUnique({
        where: { id: generation.applicationId },
        include: { jobAnalysis: true },
      });

      if (!application) {
        throw new NotFoundException(
          `Job application ${generation.applicationId} not found`,
        );
      }

      const masterProfile = await this.profileService.getProfile();
      const targetLanguage = generation.targetLanguage as SupportedLanguage;
      const tailorOutput = await this.aiService.tailorResume({
        company: application.company,
        position: application.position,
        jobDescription: application.jobDescription,
        masterProfile,
        jobAnalysis: application.jobAnalysis
          ? (application.jobAnalysis as unknown as JobAnalysisDto)
          : undefined,
        targetLanguage,
      });

      await this.prisma.$transaction(async (transaction) => {
        const existingCount = await transaction.tailoredResume.count({
          where: { applicationId: generation.applicationId },
        });
        const createdResume = await transaction.tailoredResume.create({
          data: {
            applicationId: generation.applicationId,
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
            generationReport:
              tailorOutput.generationReport as unknown as Prisma.InputJsonValue,
          },
        });

        await transaction.tailoringGeneration.update({
          where: { id: generation.id },
          data: {
            status: "COMPLETED",
            resumeId: createdResume.id,
            completedAt: new Date(),
            errorMessage: null,
          },
        });
        await transaction.jobApplication.updateMany({
          where: {
            id: generation.applicationId,
            status: { in: ["DRAFT", "ANALYZED", "TAILORED"] },
          },
          data: { status: "TAILORED" },
        });
        await transaction.jobApplication.updateMany({
          where: { id: generation.applicationId },
          data: { targetLanguage },
        });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const shouldRetry = generation.attempts < MAX_ATTEMPTS;

      await this.prisma.tailoringGeneration.update({
        where: { id: generation.id },
        data: {
          status: shouldRetry ? "QUEUED" : "FAILED",
          errorMessage: message.slice(0, 1_000),
          availableAt: new Date(
            Date.now() + (shouldRetry ? RETRY_DELAY_MS : 0),
          ),
          completedAt: shouldRetry ? null : new Date(),
        },
      });

      this.logger?.error(
        {
          event: "tailoring.generation.failed",
          generationId: generation.id,
          applicationId: generation.applicationId,
          attempt: generation.attempts,
          willRetry: shouldRetry,
          errorType:
            error instanceof Error ? error.constructor.name : "Unknown",
        },
        "Tailoring generation failed",
      );
    }
  }

  private async recoverStaleGenerations(): Promise<void> {
    await this.prisma.tailoringGeneration.updateMany({
      where: { status: "PROCESSING" },
      data: {
        status: "QUEUED",
        availableAt: new Date(),
        errorMessage: "Geração retomada após reinício do serviço.",
      },
    });
  }

  private mapGeneration(
    generation: TailoringGenerationRecord,
  ): TailoringGenerationDto {
    return {
      id: generation.id,
      applicationId: generation.applicationId,
      targetLanguage: generation.targetLanguage as SupportedLanguage,
      status: generation.status,
      attempts: generation.attempts,
      errorMessage: generation.errorMessage,
      resumeId: generation.resumeId,
      createdAt: generation.createdAt.toISOString(),
      updatedAt: generation.updatedAt.toISOString(),
      startedAt: generation.startedAt?.toISOString() || null,
      completedAt: generation.completedAt?.toISOString() || null,
    };
  }
}

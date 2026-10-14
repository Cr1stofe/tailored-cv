import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from "@nestjs/common";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";
import type { AnalysisGenerationDto, JobAnalysisDto } from "@tailored-cv/types";
import { AIService } from "../ai/ai.service";
import { ProfileService } from "../profile/profile.service";
import { PrismaService } from "../prisma/prisma.service";

const POLL_INTERVAL_MS = 2_000;
const RETRY_DELAY_MS = 10_000;
const MAX_ATTEMPTS = 2;

type AnalysisGenerationStatus =
  "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface AnalysisGenerationRecord {
  id: string;
  applicationId: string;
  status: AnalysisGenerationStatus;
  attempts: number;
  errorMessage: string | null;
  analysisId: string | null;
  availableAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AnalysisGenerationService
  implements OnModuleInit, OnModuleDestroy
{
  private processing = false;
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly profileService: ProfileService,
    private readonly aiService: AIService,
    @Optional()
    @InjectPinoLogger(AnalysisGenerationService.name)
    private readonly logger?: PinoLogger,
  ) {}

  onModuleInit(): void {
    void this.recoverStaleGenerations().catch((error) => {
      this.logger?.error(
        {
          event: "analysis.queue.recovery_failed",
          errorType:
            error instanceof Error ? error.constructor.name : "Unknown",
        },
        "Failed to recover stale analysis generations",
      );
    });
    this.timer = setInterval(() => void this.processNext(), POLL_INTERVAL_MS);
    void this.processNext();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async enqueue(applicationId: string): Promise<AnalysisGenerationDto> {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException(`Job application ${applicationId} not found`);
    }

    const generation = await this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT "id"
        FROM "job_applications"
        WHERE "id" = ${applicationId}
        FOR UPDATE
      `;

      const activeTailoring = await transaction.tailoringGeneration.findFirst({
        where: {
          applicationId,
          status: { in: ["QUEUED", "PROCESSING"] },
        },
      });

      if (activeTailoring) {
        throw new ConflictException(
          "A resume tailoring job is already running for this application.",
        );
      }

      const active = await transaction.analysisGeneration.findFirst({
        where: {
          applicationId,
          status: { in: ["QUEUED", "PROCESSING"] },
        },
        orderBy: { createdAt: "desc" },
      });

      if (active) return active;

      return transaction.analysisGeneration.create({
        data: { applicationId },
      });
    });

    void this.processNext();
    return this.mapGeneration(generation);
  }

  async getStatus(applicationId: string): Promise<AnalysisGenerationDto> {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException(`Job application ${applicationId} not found`);
    }

    const generation = await this.prisma.analysisGeneration.findFirst({
      where: { applicationId },
      orderBy: { createdAt: "desc" },
    });

    if (!generation) return this.idleStatus(applicationId);

    return this.mapGeneration(generation);
  }

  private async processNext(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      const next = await this.prisma.analysisGeneration.findFirst({
        where: { status: "QUEUED", availableAt: { lte: new Date() } },
        orderBy: { createdAt: "asc" },
      });

      if (!next) return;

      const claimed = await this.prisma.analysisGeneration.updateMany({
        where: { id: next.id, status: "QUEUED" },
        data: {
          status: "PROCESSING",
          attempts: { increment: 1 },
          startedAt: new Date(),
          errorMessage: null,
        },
      });

      if (claimed.count === 0) return;

      const generation = await this.prisma.analysisGeneration.findUnique({
        where: { id: next.id },
      });

      if (generation) await this.processGeneration(generation);
    } catch (error) {
      this.logger?.error(
        {
          event: "analysis.queue.failed",
          errorType:
            error instanceof Error ? error.constructor.name : "Unknown",
        },
        "Analysis queue cycle failed",
      );
    } finally {
      this.processing = false;
    }
  }

  private async processGeneration(
    generation: AnalysisGenerationRecord,
  ): Promise<void> {
    try {
      const application = await this.prisma.jobApplication.findUnique({
        where: { id: generation.applicationId },
      });

      if (!application) {
        throw new NotFoundException(
          `Job application ${generation.applicationId} not found`,
        );
      }

      const masterProfile = await this.profileService.getProfile();
      const analysisOutput = await this.aiService.analyzeJob({
        company: application.company,
        position: application.position,
        jobDescription: application.jobDescription,
        masterProfile,
      });

      await this.prisma.$transaction(async (transaction) => {
        const savedAnalysis = await transaction.jobAnalysis.upsert({
          where: { applicationId: generation.applicationId },
          create: this.toAnalysisData(analysisOutput, generation.applicationId),
          update: this.toAnalysisData(analysisOutput, generation.applicationId),
        });

        await transaction.analysisGeneration.update({
          where: { id: generation.id },
          data: {
            status: "COMPLETED",
            analysisId: savedAnalysis.id,
            completedAt: new Date(),
            errorMessage: null,
          },
        });

        await transaction.jobApplication.updateMany({
          where: { id: generation.applicationId, status: "DRAFT" },
          data: { status: "ANALYZED" },
        });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const shouldRetry = generation.attempts < MAX_ATTEMPTS;

      await this.prisma.analysisGeneration.update({
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
          event: "analysis.generation.failed",
          generationId: generation.id,
          applicationId: generation.applicationId,
          attempt: generation.attempts,
          willRetry: shouldRetry,
          errorType:
            error instanceof Error ? error.constructor.name : "Unknown",
        },
        "Analysis generation failed",
      );
    }
  }

  private toAnalysisData(
    analysis: Omit<
      JobAnalysisDto,
      "id" | "applicationId" | "createdAt" | "updatedAt"
    >,
    applicationId: string,
  ) {
    return {
      applicationId,
      summary: analysis.summary,
      seniorityLevel: analysis.seniorityLevel,
      requiredSkills: analysis.requiredSkills,
      desiredSkills: analysis.desiredSkills,
      keyResponsibilities: analysis.keyResponsibilities,
      keywords: analysis.keywords,
      matchScore: analysis.matchScore,
      matchingSkills: analysis.matchingSkills,
      missingSkills: analysis.missingSkills,
      strategicRecommendations: analysis.strategicRecommendations,
    };
  }

  private async recoverStaleGenerations(): Promise<void> {
    await this.prisma.analysisGeneration.updateMany({
      where: { status: "PROCESSING" },
      data: {
        status: "QUEUED",
        availableAt: new Date(),
        errorMessage: "Análise retomada após reinício do serviço.",
      },
    });
  }

  private mapGeneration(
    generation: AnalysisGenerationRecord,
  ): AnalysisGenerationDto {
    return {
      id: generation.id,
      applicationId: generation.applicationId,
      status: generation.status,
      attempts: generation.attempts,
      errorMessage: generation.errorMessage,
      analysisId: generation.analysisId,
      createdAt: generation.createdAt.toISOString(),
      updatedAt: generation.updatedAt.toISOString(),
      startedAt: generation.startedAt?.toISOString() || null,
      completedAt: generation.completedAt?.toISOString() || null,
    };
  }

  private idleStatus(applicationId: string): AnalysisGenerationDto {
    return {
      id: null,
      applicationId,
      status: "IDLE",
      attempts: 0,
      errorMessage: null,
      analysisId: null,
      createdAt: null,
      updatedAt: null,
      startedAt: null,
      completedAt: null,
    };
  }
}

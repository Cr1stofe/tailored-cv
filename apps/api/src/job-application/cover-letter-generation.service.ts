import {
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from "@nestjs/common";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";
import type {
  CoverLetterFocus,
  CoverLetterGenerationDto,
  SupportedLanguage,
} from "@tailored-cv/types";
import { AIService } from "../ai/ai.service";
import { ProfileService } from "../profile/profile.service";
import { PrismaService } from "../prisma/prisma.service";

const POLL_INTERVAL_MS = 2_000;
const RETRY_DELAY_MS = 10_000;
const MAX_ATTEMPTS = 2;

export interface CoverLetterGenerationRecord {
  id: string;
  applicationId: string;
  targetLanguage: string;
  focus: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  attempts: number;
  errorMessage: string | null;
  content: string | null;
  availableAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class CoverLetterGenerationService
  implements OnModuleInit, OnModuleDestroy
{
  private processing = false;
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly profileService: ProfileService,
    private readonly aiService: AIService,
    @Optional()
    @InjectPinoLogger(CoverLetterGenerationService.name)
    private readonly logger?: PinoLogger,
  ) {}

  onModuleInit(): void {
    void this.recoverStaleGenerations().catch((error) => {
      this.logger?.error(
        {
          event: "cover_letter.queue.recovery_failed",
          errorType:
            error instanceof Error ? error.constructor.name : "Unknown",
        },
        "Failed to recover stale cover letter generations",
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
    options: { targetLanguage?: SupportedLanguage; focus: CoverLetterFocus },
  ): Promise<CoverLetterGenerationDto> {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException(`Job application ${applicationId} not found`);
    }

    const targetLanguage =
      options.targetLanguage ||
      (application.targetLanguage as SupportedLanguage) ||
      "PT";
    const generation = await this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT "id"
        FROM "job_applications"
        WHERE "id" = ${applicationId}
        FOR UPDATE
      `;

      const active = await transaction.coverLetterGeneration.findFirst({
        where: {
          applicationId,
          targetLanguage,
          focus: options.focus,
          status: { in: ["QUEUED", "PROCESSING"] },
        },
        orderBy: { createdAt: "desc" },
      });

      if (active) return active;

      return transaction.coverLetterGeneration.create({
        data: {
          applicationId,
          targetLanguage,
          focus: options.focus,
        },
      });
    });

    void this.processNext();
    return this.mapGeneration(generation);
  }

  async getStatus(
    applicationId: string,
    options: { targetLanguage?: SupportedLanguage; focus: CoverLetterFocus },
  ): Promise<CoverLetterGenerationDto> {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException(`Job application ${applicationId} not found`);
    }

    const targetLanguage =
      options.targetLanguage ||
      (application.targetLanguage as SupportedLanguage) ||
      "PT";
    const generation = await this.prisma.coverLetterGeneration.findFirst({
      where: {
        applicationId,
        targetLanguage,
        focus: options.focus,
      },
      orderBy: { createdAt: "desc" },
    });

    return generation
      ? this.mapGeneration(generation)
      : this.idleStatus(applicationId, targetLanguage, options.focus);
  }

  private async processNext(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      const next = await this.prisma.coverLetterGeneration.findFirst({
        where: { status: "QUEUED", availableAt: { lte: new Date() } },
        orderBy: { createdAt: "asc" },
      });

      if (!next) return;

      const claimed = await this.prisma.coverLetterGeneration.updateMany({
        where: { id: next.id, status: "QUEUED" },
        data: {
          status: "PROCESSING",
          attempts: { increment: 1 },
          startedAt: new Date(),
          errorMessage: null,
        },
      });

      if (claimed.count === 0) return;

      const generation = await this.prisma.coverLetterGeneration.findUnique({
        where: { id: next.id },
      });

      if (generation) await this.processGeneration(generation);
    } catch (error) {
      this.logger?.error(
        {
          event: "cover_letter.queue.failed",
          errorType:
            error instanceof Error ? error.constructor.name : "Unknown",
        },
        "Cover letter queue cycle failed",
      );
    } finally {
      this.processing = false;
    }
  }

  private async processGeneration(
    generation: CoverLetterGenerationRecord,
  ): Promise<void> {
    try {
      const application = await this.prisma.jobApplication.findUnique({
        where: { id: generation.applicationId },
        include: {
          tailoredResumes: {
            where: { language: generation.targetLanguage },
            orderBy: { version: "desc" },
            take: 1,
          },
        },
      });

      if (!application) {
        throw new NotFoundException(
          `Job application ${generation.applicationId} not found`,
        );
      }

      const masterProfile = await this.profileService.getProfile();
      const resume = application.tailoredResumes[0];
      const output = await this.aiService.generateCoverLetter({
        company: application.company,
        position: application.position,
        jobDescription: application.jobDescription,
        masterProfile,
        targetLanguage: generation.targetLanguage as SupportedLanguage,
        focus: generation.focus as CoverLetterFocus,
        tailoredResume: resume
          ? {
              id: resume.id,
              applicationId: resume.applicationId,
              version: resume.version,
              title: resume.title,
              language: resume.language as SupportedLanguage,
              targetedHeadline: resume.targetedHeadline,
              reframedSummary: resume.reframedSummary,
              highlightedSkills: resume.highlightedSkills,
              tailoredExperiences: resume.tailoredExperiences as never,
              tailoredProjects: resume.tailoredProjects as never,
              generationReport: resume.generationReport as never,
              createdAt: resume.createdAt.toISOString(),
              updatedAt: resume.updatedAt.toISOString(),
            }
          : null,
      });

      await this.prisma.coverLetterGeneration.update({
        where: { id: generation.id },
        data: {
          status: "COMPLETED",
          content: output.content,
          completedAt: new Date(),
          errorMessage: null,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const shouldRetry = generation.attempts < MAX_ATTEMPTS;

      await this.prisma.coverLetterGeneration.update({
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
          event: "cover_letter.generation.failed",
          generationId: generation.id,
          applicationId: generation.applicationId,
          attempt: generation.attempts,
          willRetry: shouldRetry,
          errorType:
            error instanceof Error ? error.constructor.name : "Unknown",
        },
        "Cover letter generation failed",
      );
    }
  }

  private async recoverStaleGenerations(): Promise<void> {
    await this.prisma.coverLetterGeneration.updateMany({
      where: { status: "PROCESSING" },
      data: {
        status: "QUEUED",
        availableAt: new Date(),
        errorMessage:
          "Carta de apresentação retomada após reinício do serviço.",
      },
    });
  }

  private mapGeneration(
    generation: CoverLetterGenerationRecord,
  ): CoverLetterGenerationDto {
    return {
      id: generation.id,
      applicationId: generation.applicationId,
      targetLanguage: generation.targetLanguage as SupportedLanguage,
      focus: generation.focus as CoverLetterFocus,
      status: generation.status,
      attempts: generation.attempts,
      errorMessage: generation.errorMessage,
      content: generation.content,
      createdAt: generation.createdAt.toISOString(),
      updatedAt: generation.updatedAt.toISOString(),
      startedAt: generation.startedAt?.toISOString() || null,
      completedAt: generation.completedAt?.toISOString() || null,
    };
  }

  private idleStatus(
    applicationId: string,
    targetLanguage: SupportedLanguage,
    focus: CoverLetterFocus,
  ): CoverLetterGenerationDto {
    return {
      id: null,
      applicationId,
      targetLanguage,
      focus,
      status: "IDLE",
      attempts: 0,
      errorMessage: null,
      content: null,
      createdAt: null,
      updatedAt: null,
      startedAt: null,
      completedAt: null,
    };
  }
}

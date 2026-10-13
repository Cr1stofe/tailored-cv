import { Injectable, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";
import type { AIHealthStatus, MasterProfileDto } from "@tailored-cv/types";
import {
  AIProvider,
  JobAnalysisInput,
  TailorResumeInput,
  JobAnalysisOutput,
  TailoredResumeOutput,
} from "./ai.constants";
import { GeminiProvider } from "./providers/gemini.provider";
import { MockProvider } from "./providers/mock.provider";
import { MetricsService } from "../observability/metrics.service";

@Injectable()
export class AIService implements AIProvider {
  private readonly provider: AIProvider;
  private readonly providerName: "gemini" | "mock";
  private readonly modelName: string;

  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly metrics?: MetricsService,
    @Optional()
    @InjectPinoLogger(AIService.name)
    private readonly logger?: PinoLogger,
  ) {
    const apiKey = this.configService.get<string>("GEMINI_API_KEY");

    if (apiKey && apiKey.trim().length > 0) {
      const modelName =
        this.configService.get<string>("GEMINI_MODEL") ||
        "gemini-flash-lite-latest";
      this.providerName = "gemini";
      this.modelName = modelName;
      this.logger?.info(
        `AIService: Initialized with GeminiProvider (${modelName})`,
      );
      this.provider = new GeminiProvider(apiKey, modelName);
    } else {
      this.logger?.warn(
        "AIService: GEMINI_API_KEY not provided. Fallback to MockProvider enabled.",
      );
      this.provider = new MockProvider();
      this.providerName = "mock";
      this.modelName = "mock";
    }
  }

  async analyzeJob(input: JobAnalysisInput): Promise<JobAnalysisOutput> {
    return this.observe("analyze_job", () => this.provider.analyzeJob(input));
  }

  async tailorResume(input: TailorResumeInput): Promise<TailoredResumeOutput> {
    return this.observe("tailor_resume", () =>
      this.provider.tailorResume(input),
    );
  }

  async translateProfileToEnglish(
    profile: MasterProfileDto,
  ): Promise<MasterProfileDto> {
    return this.observe("translate_profile", () =>
      this.provider.translateProfileToEnglish(profile),
    );
  }

  async checkHealth(): Promise<AIHealthStatus> {
    if (this.provider.checkHealth) {
      return this.provider.checkHealth();
    }
    return {
      status: "connected",
      provider: "mock",
      tokensConsumed: 0,
      latencyMs: 0,
    };
  }

  private async observe<T>(
    operation: string,
    action: () => Promise<T>,
  ): Promise<T> {
    const startedAt = performance.now();
    this.logger?.info(
      {
        event: "ai.request.started",
        operation,
        provider: this.providerName,
        model: this.modelName,
      },
      "AI request started",
    );

    try {
      const result = await action();
      const durationMs = performance.now() - startedAt;
      this.metrics?.recordAIRequest(
        operation,
        this.providerName,
        "success",
        durationMs,
      );
      this.logger?.info(
        {
          event: "ai.request.completed",
          operation,
          provider: this.providerName,
          model: this.modelName,
          status: "success",
          durationMs: Math.round(durationMs),
        },
        "AI request completed",
      );
      return result;
    } catch (error) {
      const durationMs = performance.now() - startedAt;
      this.metrics?.recordAIRequest(
        operation,
        this.providerName,
        "error",
        durationMs,
      );
      this.logger?.error(
        {
          event: "ai.request.failed",
          operation,
          provider: this.providerName,
          model: this.modelName,
          status: "error",
          durationMs: Math.round(durationMs),
          errorType:
            error instanceof Error ? error.constructor.name : "Unknown",
        },
        "AI request failed",
      );
      throw error;
    }
  }
}

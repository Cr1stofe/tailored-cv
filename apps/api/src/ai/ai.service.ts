import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AIHealthStatus } from "@tailored-cv/types";
import {
  AIProvider,
  JobAnalysisInput,
  TailorResumeInput,
  JobAnalysisOutput,
  TailoredResumeOutput,
} from "./ai.constants";
import { GeminiProvider } from "./providers/gemini.provider";
import { MockProvider } from "./providers/mock.provider";

@Injectable()
export class AIService implements AIProvider {
  private readonly logger = new Logger(AIService.name);
  private readonly provider: AIProvider;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>("GEMINI_API_KEY");

    if (apiKey && apiKey.trim().length > 0) {
      const modelName =
        this.configService.get<string>("GEMINI_MODEL") ||
        "gemini-flash-lite-latest";
      this.logger.log(
        `AIService: Initialized with GeminiProvider (${modelName})`,
      );
      this.provider = new GeminiProvider(apiKey, modelName);
    } else {
      this.logger.warn(
        "AIService: GEMINI_API_KEY not provided. Fallback to MockProvider enabled.",
      );
      this.provider = new MockProvider();
    }
  }

  async analyzeJob(input: JobAnalysisInput): Promise<JobAnalysisOutput> {
    return this.provider.analyzeJob(input);
  }

  async tailorResume(input: TailorResumeInput): Promise<TailoredResumeOutput> {
    return this.provider.tailorResume(input);
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
}

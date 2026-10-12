import type { AIHealthStatus, MasterProfileDto } from "@tailored-cv/types";
import type {
  AIProvider,
  JobAnalysisInput,
  JobAnalysisOutput,
  TailorResumeInput,
  TailoredResumeOutput,
} from "../ai.constants";
import { GeminiClient } from "./gemini/gemini-client";
import { analyzeJobWithGemini } from "./gemini/job-analyzer";
import { translateProfileWithGemini } from "./gemini/profile-translator";
import { tailorResumeWithGemini } from "./gemini/resume-tailor";

export class GeminiProvider implements AIProvider {
  private readonly client: GeminiClient;

  constructor(apiKey: string, modelName = "gemini-flash-lite-latest") {
    this.client = new GeminiClient(apiKey, modelName);
  }

  checkHealth(): Promise<AIHealthStatus> {
    return this.client.checkHealth();
  }

  analyzeJob(input: JobAnalysisInput): Promise<JobAnalysisOutput> {
    return analyzeJobWithGemini(this.client, input);
  }

  tailorResume(input: TailorResumeInput): Promise<TailoredResumeOutput> {
    return tailorResumeWithGemini(this.client, input);
  }

  translateProfileToEnglish(
    profile: MasterProfileDto,
  ): Promise<MasterProfileDto> {
    return translateProfileWithGemini(this.client, profile);
  }
}

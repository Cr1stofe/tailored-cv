import { GoogleGenAI } from "@google/genai";
import { Logger, ServiceUnavailableException } from "@nestjs/common";
import type { AIHealthStatus } from "@tailored-cv/types";

export class GeminiClient {
  private readonly logger = new Logger(GeminiClient.name);
  private readonly client: GoogleGenAI;

  constructor(
    apiKey: string,
    private readonly modelName: string,
  ) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async checkHealth(): Promise<AIHealthStatus> {
    const start = Date.now();
    try {
      const list = await this.client.models.list();
      const availableModels: string[] = [];
      for await (const model of list) {
        if (model.name?.includes("flash")) {
          availableModels.push(model.name.replace(/^models\//, ""));
        }
      }
      return {
        status: "connected",
        provider: "gemini",
        tokensConsumed: 0,
        latencyMs: Date.now() - start,
        availableModels: availableModels.slice(0, 8),
      };
    } catch (error: unknown) {
      return {
        status: "error",
        provider: "gemini",
        tokensConsumed: 0,
        latencyMs: Date.now() - start,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async generate(prompt: string, timeoutMs = 35000): Promise<string> {
    const models = this.getCandidateModels();
    let lastError: unknown;

    for (const model of models) {
      try {
        const start = Date.now();
        this.logger.log(`Invoking Gemini with model: ${model}`);
        const text = await this.generateWithTimeout(model, prompt, timeoutMs);
        const elapsed = Date.now() - start;

        if (model !== this.modelName) {
          this.logger.warn(
            `Successfully answered using fallback model '${model}' in ${elapsed}ms (primary '${this.modelName}' was unavailable).`,
          );
        } else {
          this.logger.log(
            `Answered successfully using '${model}' in ${elapsed}ms.`,
          );
        }
        return text;
      } catch (error: unknown) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Model '${model}' failed with error: ${message.slice(0, 180)}. Attempting fallback model...`,
        );
      }
    }

    this.logger.error(
      "All Gemini candidate models failed to generate content.",
    );
    const lastMessage =
      lastError instanceof Error ? lastError.message : String(lastError);

    if (
      lastMessage.includes("503") ||
      lastMessage.includes("high demand") ||
      lastMessage.includes("UNAVAILABLE")
    ) {
      throw new ServiceUnavailableException(
        "Os servidores do Google Gemini estão sob alta demanda temporária (503). Por favor, aguarde alguns instantes e tente novamente.",
      );
    }

    throw lastError;
  }

  private getCandidateModels(): string[] {
    return Array.from(
      new Set([
        this.modelName,
        "gemini-flash-lite-latest",
        "gemini-3.1-flash-lite",
        "gemini-3.5-flash-lite",
        "gemini-flash-latest",
      ]),
    );
  }

  private async generateWithTimeout(
    model: string,
    prompt: string,
    timeoutMs: number,
  ): Promise<string> {
    let timeoutId: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(
          new Error(
            `Timeout de ${timeoutMs}ms excedido aguardando resposta do modelo '${model}'.`,
          ),
        );
      }, timeoutMs);
    });

    try {
      const apiCall = this.client.models
        .generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.2,
          },
        })
        .then((response) => response.text?.trim() || "{}");

      return await Promise.race([apiCall, timeoutPromise]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }
}

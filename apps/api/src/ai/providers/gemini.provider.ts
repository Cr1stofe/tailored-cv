import { GoogleGenAI } from "@google/genai";
import { Logger, ServiceUnavailableException } from "@nestjs/common";
import type { AIHealthStatus } from "@tailored-cv/types";
import {
  AIProvider,
  JobAnalysisInput,
  TailorResumeInput,
  JobAnalysisOutput,
  TailoredResumeOutput,
  AI_SYSTEM_PROMPT,
  jobAnalysisOutputSchema,
  tailoredResumeOutputSchema,
} from "../ai.constants";

function safeParseAiJson<T>(rawText: string): T {
  let cleaned = rawText.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  cleaned = cleaned.replace(/\/\/[^\n\r]*/g, "");
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, "");
  cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const repaired = cleaned.replace(
      /([[,]\s*)([-a-zA-Z0-9_./]+)(\s*[,\]])/g,
      (match, p1, p2, p3) => {
        if (
          p2 === "true" ||
          p2 === "false" ||
          p2 === "null" ||
          !isNaN(Number(p2))
        ) {
          return match;
        }
        return `${p1}"${p2}"${p3}`;
      },
    );
    return JSON.parse(repaired) as T;
  }
}

export class GeminiProvider implements AIProvider {
  private readonly logger = new Logger(GeminiProvider.name);
  private readonly client: GoogleGenAI;
  private readonly modelName: string;

  constructor(apiKey: string, modelName = "gemini-flash-lite-latest") {
    this.client = new GoogleGenAI({ apiKey });
    this.modelName = modelName;
  }

  async checkHealth(): Promise<AIHealthStatus> {
    const start = Date.now();
    try {
      const list = await this.client.models.list();
      const availableModels: string[] = [];
      for await (const m of list) {
        if (m.name && m.name.includes("flash")) {
          availableModels.push(m.name.replace(/^models\//, ""));
        }
      }
      return {
        status: "connected",
        provider: "gemini",
        tokensConsumed: 0,
        latencyMs: Date.now() - start,
        availableModels: availableModels.slice(0, 8),
      };
    } catch (err: unknown) {
      return {
        status: "error",
        provider: "gemini",
        tokensConsumed: 0,
        latencyMs: Date.now() - start,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }

  async analyzeJob(input: JobAnalysisInput): Promise<JobAnalysisOutput> {
    const prompt = `
${AI_SYSTEM_PROMPT}

TAREFA: Analisar a descrição da vaga e comparar com o perfil do candidato.

EMPRESA: ${input.company}
CARGO: ${input.position}
DESCRIÇÃO DA VAGA:
"""
${input.jobDescription}
"""

PERFIL DO CANDIDATO (MASTER PROFILE):
"""
Resumo: ${input.masterProfile.summary || "Não informado"}
Competências cadastradas: ${input.masterProfile.skills.map((s) => `${s.name} (${s.category})`).join(", ")}
Experiências: ${input.masterProfile.experiences.map((e) => `${e.position} em ${e.company} [${e.technologies.join(", ")}]`).join("; ")}
"""

Retorne EXCLUSIVAMENTE um objeto JSON válido, sem comentários, sem markdown e com todas as chaves e strings entre aspas duplas, seguindo esta estrutura:
{
  "summary": "Visão geral da vaga e seu foco principal",
  "seniorityLevel": "Júnior / Pleno / Sênior / Especialista",
  "requiredSkills": ["array de competências estritamente obrigatórias"],
  "desiredSkills": ["array de competências desejáveis/diferenciais"],
  "keyResponsibilities": ["principais responsabilidades exigidas"],
  "keywords": ["palavras-chave estratégicas para ATS"],
  "matchScore": 85,
  "matchingSkills": ["competências que a vaga pede e que o candidato REALMENTE tem"],
  "missingSkills": ["competências que a vaga pede mas o candidato NÃO tem cadastrado"],
  "strategicRecommendations": ["orientações estratégicas honestas sobre como destacar pontos fortes"]
}
`;

    try {
      const text = await this.generateWithFallback(prompt);
      const parsedJson = safeParseAiJson(text);
      return jobAnalysisOutputSchema.parse(parsedJson);
    } catch (error) {
      this.logger.error(
        "Failed to analyze job with Gemini",
        error instanceof Error ? error.stack : error,
      );
      throw error;
    }
  }

  private getCandidateModels(): string[] {
    const list = [
      this.modelName,
      "gemini-flash-lite-latest",
      "gemini-3.1-flash-lite",
      "gemini-3.5-flash-lite",
      "gemini-flash-latest",
    ];
    return Array.from(new Set(list));
  }

  private async generateWithTimeout(
    model: string,
    prompt: string,
    timeoutMs = 15000,
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
        .then((res) => res.text?.trim() || "{}");

      return await Promise.race([apiCall, timeoutPromise]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  private async generateWithFallback(prompt: string): Promise<string> {
    const models = this.getCandidateModels();
    let lastError: unknown;

    for (const model of models) {
      try {
        const start = Date.now();
        this.logger.log(`Invoking Gemini with model: ${model}`);
        const text = await this.generateWithTimeout(model, prompt, 15000);
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
      } catch (err: unknown) {
        lastError = err;
        const errMessage = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Model '${model}' failed with error: ${errMessage.slice(0, 180)}. Attempting fallback model...`,
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

  async tailorResume(input: TailorResumeInput): Promise<TailoredResumeOutput> {
    const prompt = `
${AI_SYSTEM_PROMPT}

TAREFA: Reestruturar o currículo do candidato para a vaga alvo sem inventar nada.

EMPRESA ALVO: ${input.company}
CARGO ALVO: ${input.position}
DESCRIÇÃO DA VAGA:
"""
${input.jobDescription}
"""

PALAVRAS-CHAVE DA ANÁLISE:
${input.jobAnalysis ? input.jobAnalysis.keywords.join(", ") : "Requisitos da descrição da vaga"}

MASTER PROFILE COMPLETO (FONTE DA VERDADE):
"""
Nome: ${input.masterProfile.fullName}
Resumo Original: ${input.masterProfile.summary || ""}

Competências Reais:
${input.masterProfile.skills.map((s) => `- ${s.name} (${s.category})`).join("\n")}

Experiências Reais:
${input.masterProfile.experiences
  .map(
    (e) => `
[ID: ${e.id || "exp"}]
Empresa: ${e.company}
Cargo: ${e.position}
Período: ${e.startDate} até ${e.endDate || (e.isCurrent ? "Presente" : "")}
Localização: ${e.location || "Remoto"}
Tecnologias reais: ${e.technologies.join(", ")}
Bullets originais:
${e.highlights.map((h) => `* ${h}`).join("\n")}
`,
  )
  .join("\n")}

Projetos Reais:
${input.masterProfile.projects
  .map(
    (p) => `
[ID: ${p.id || "proj"}]
Nome: ${p.name}
Descrição: ${p.description}
Tecnologias: ${p.technologies.join(", ")}
Bullets originais:
${p.highlights.map((h) => `* ${h}`).join("\n")}
`,
  )
  .join("\n")}
"""

INSTRUÇÃO ESPECÍFICA:
1. Gere um targetedHeadline preciso (ex: "Senior Full Stack Engineer | React, Node.js & Cloud Architecture").
2. Reframe o resumo profissional (reframedSummary), destacando os anos de experiência e pontos fortes que respondem à vaga alvo, usando apenas fatos reais.
3. Selecione e ordene em highlightedSkills as competências que o candidato tem que mais combinam com a vaga.
4. Para cada experiência em tailoredExperiences, mantenha a empresa, cargo, período e technologies reais, mas reescreva os bullets em "reframedHighlights" com forte orientação a impacto e alinhamento de vocabulário com a vaga, sem NUNCA inventar fatos ou números.
5. Em tailoredProjects, selecione APENAS os 2 ou 3 projetos do candidato de maior impacto e relevância técnica para esta vaga específica (ex: para vagas frontend/React/Next.js, priorize Ranking dos Políticos e LMS Veltro; para backend/cloud/fullstack, priorize LMS Veltro e Tailored CV; para mobile, inclua Motul Expert). Refatore os bullets em reframedHighlights alinhando vocabulário com a vaga sem inventar fatos.

Retorne APENAS um JSON válido seguindo estritamente este formato:
{
  "title": "Currículo Adaptado - ${input.position} na ${input.company}",
  "targetedHeadline": "Headline estratégico profissional",
  "reframedSummary": "Resumo profissional refinado com foco na vaga alvo",
  "highlightedSkills": ["skill1", "skill2", "skill3"],
  "tailoredExperiences": [
    {
      "experienceId": "id original",
      "company": "Empresa",
      "position": "Cargo",
      "period": "01/2023 - Presente",
      "location": "São Paulo, Brasil",
      "reframedHighlights": ["bullet 1 refatorado", "bullet 2 refatorado"],
      "technologies": ["tech1", "tech2"]
    }
  ],
  "tailoredProjects": [
    {
      "projectId": "id original",
      "name": "Nome",
      "description": "Descrição",
      "url": "https://...",
      "reframedHighlights": ["bullet do projeto"],
      "technologies": ["tech1"]
    }
  ]
}
`;

    try {
      const text = await this.generateWithFallback(prompt);
      const parsedJson = safeParseAiJson(text);
      return tailoredResumeOutputSchema.parse(parsedJson);
    } catch (error) {
      this.logger.error(
        "Failed to tailor resume with Gemini",
        error instanceof Error ? error.stack : error,
      );
      throw error;
    }
  }
}

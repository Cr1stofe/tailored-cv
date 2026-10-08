import { GoogleGenAI } from "@google/genai";
import { Logger, ServiceUnavailableException } from "@nestjs/common";
import type { AIHealthStatus, MasterProfileDto } from "@tailored-cv/types";
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

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    void 0;
  }

  cleaned = cleaned.replace(/^\s*\/\/[^\n\r]*/gm, "");
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, "");
  cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    void 0;
  }

  let inString = false;
  let isEscaped = false;
  let result = "";

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];

    if (char === "\\" && inString) {
      isEscaped = !isEscaped;
      result += char;
      continue;
    }

    if (char === '"' && !isEscaped) {
      if (!inString) {
        inString = true;
        result += char;
      } else {
        let j = i + 1;
        while (j < cleaned.length && /\s/.test(cleaned[j])) {
          j++;
        }
        const nextChar = cleaned[j];

        let isEndQuote = false;
        if (
          nextChar === ":" ||
          nextChar === "}" ||
          nextChar === "]"
        ) {
          isEndQuote = true;
        } else if (nextChar === ",") {
          let k = j + 1;
          while (k < cleaned.length && /\s/.test(cleaned[k])) {
            k++;
          }
          const afterComma = cleaned[k];
          if (
            afterComma === '"' ||
            afterComma === "{" ||
            afterComma === "[" ||
            afterComma === "}" ||
            afterComma === "]"
          ) {
            isEndQuote = true;
          }
        }

        if (isEndQuote) {
          inString = false;
          result += char;
        } else {
          result += "'";
        }
      }
    } else {
      if (inString && (char === "\n" || char === "\r")) {
        result += "\\n";
      } else if (inString && char === "\t") {
        result += "\\t";
      } else {
        result += char;
      }
    }

    if (isEscaped && char !== "\\") {
      isEscaped = false;
    }
  }

  try {
    return JSON.parse(result) as T;
  } catch {
    const repaired = result.replace(
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

  private async generateWithFallback(
    prompt: string,
    timeoutMs = 35000,
  ): Promise<string> {
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
    const isEnglish = input.targetLanguage === "EN";
    const languageInstruction = isEnglish
      ? `DIRETRIZ OBRIGATÓRIA DE IDIOMA (TARGET LANGUAGE: ENGLISH):
- O currículo gerado DEVE SER 100% EM INGLÊS TÉCNICO FLUENTE (EUA / Mercado Internacional).
- "title" deve ser em inglês (ex: "Tailored Resume — ${input.position} (${input.company})").
- "targetedHeadline" deve ser em inglês (ex: "Senior Full Stack Engineer | React, Node.js & Cloud Architecture").
- "reframedSummary" deve ser redigido em inglês formal, conciso e com forte impacto ATS.
- Todos os bullets ("reframedHighlights") em "tailoredExperiences" e "tailoredProjects" DEVEM SER EM INGLÊS com action verbs fortes (Developed, Engineered, Implemented, Spearheaded, Optimized, Containerized).
- "period" deve usar "Present" para posições atuais (ex: "01/2023 - Present").
- Princípio inegociável: Never invent. Only reframe.`
      : `DIRETRIZ DE IDIOMA (TARGET LANGUAGE: PORTUGUÊS):
- Gere o conteúdo em Português do Brasil com terminologia técnica padrão de mercado.`;

    const prompt = `
${AI_SYSTEM_PROMPT}

TAREFA: Reestruturar o currículo do candidato para a vaga alvo sem inventar nada.

${languageInstruction}

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
5. Em tailoredProjects, selecione APENAS os 2 ou 3 projetos do candidato de maior impacto e relevância técnica para esta vaga específica. Refatore os bullets em reframedHighlights alinhando vocabulário com a vaga sem inventar fatos.

Retorne APENAS um JSON válido seguindo estritamente este formato:
{
  "title": "${isEnglish ? `Tailored Resume — ${input.position} (${input.company})` : `Currículo Adaptado — ${input.position} (${input.company})`}",
  "language": "${input.targetLanguage || "PT"}",
  "targetedHeadline": "Headline estratégico profissional",
  "reframedSummary": "Resumo profissional refinado com foco na vaga alvo",
  "highlightedSkills": ["skill1", "skill2", "skill3"],
  "tailoredExperiences": [
    {
      "experienceId": "id original",
      "company": "Empresa",
      "position": "Cargo",
      "period": "${isEnglish ? "01/2023 - Present" : "01/2023 - Presente"}",
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
      const validated = tailoredResumeOutputSchema.parse(parsedJson);
      return {
        ...validated,
        language: input.targetLanguage || "PT",
      };
    } catch (error) {
      this.logger.error(
        "Failed to tailor resume with Gemini",
        error instanceof Error ? error.stack : error,
      );
      throw error;
    }
  }

  async translateProfileToEnglish(
    profile: MasterProfileDto,
  ): Promise<MasterProfileDto> {
    const prompt = `
${AI_SYSTEM_PROMPT}

TAREFA: Traduzir e refinar com perfeição o Master Profile do candidato para o Inglês técnico (padrão internacional de mercado tech/ATS).

PRINCÍPIO INVIOLÁVEL: "Never invent. Only reframe and faithfully translate."
1. NUNCA invente ferramentas, linguagens, nuvens, bibliotecas, empresas, métricas ou atribuições inexistentes no perfil original.
2. Mantenha nomes de empresas, URLs, links, e-mail e dados de contato exatamente intactos.
3. Traduza títulos de cargos para nomenclaturas padrão do mercado global (ex: "Desenvolvedor Full Stack" -> "Full Stack Developer", "Tech Lead / Desenvolvedor Full Stack Pleno" -> "Tech Lead / Full Stack Developer").
4. Traduza o resumo executivo (summary) com tom altamente executivo, sênior e conciso.
5. Traduza os bullets de cada experiência e projeto utilizando verbos de ação no passado em inglês (ex: "Engineered", "Developed", "Architected", "Implemented", "Spearheaded", "Optimized", "Refactored", "Configured", "Containerized") mantendo exatamente a essência do que o candidato realizou.
6. Mantenha o array de competências (skills) e tecnologias originais.
7. Traduza graus acadêmicos de formação (ex: "Bacharelado em Ciência da Computação" -> "Bachelor's Degree in Computer Science").

DIRETRIZES OBRIGATÓRIAS DE FORMATAÇÃO JSON (ESTRITAS):
- NUNCA use aspas duplas ("...") dentro de resumos, descrições ou bullets de texto. Para citar nomes de projetos, plataformas ou termos use SEMPRE aspas simples ('...'). Exemplo: plataforma 'Ranking dos Políticos' e NUNCA plataforma "Ranking dos Políticos".
- NUNCA inclua quebras de linha literais dentro de strings; use apenas \\n se necessário.
- Todas as chaves e propriedades JSON devem ser delimitadas por aspas duplas padrão.

PERFIL ORIGINAL EM PORTUGUÊS:
${JSON.stringify(
  {
    fullName: profile.fullName,
    summary: profile.summary,
    skills: profile.skills,
    experiences: profile.experiences,
    projects: profile.projects,
    educations: profile.educations,
    certifications: profile.certifications,
  },
  null,
  2,
)}

Retorne EXCLUSIVAMENTE um objeto JSON válido, sem blocos de código markdown adicionais e sem comentários, seguindo esta estrutura exata:
{
  "summary": "Executive summary in professional English...",
  "skills": [
    { "name": "Skill Name", "category": "PROFESSIONAL" }
  ],
  "experiences": [
    {
      "id": "id original mantido",
      "company": "Empresa",
      "position": "Title in English",
      "location": "Location in English or Remote",
      "startDate": "MM/YYYY",
      "endDate": "MM/YYYY ou null",
      "isCurrent": true,
      "highlights": ["Action verb bullet in English..."],
      "technologies": ["tech1", "tech2"],
      "orderIndex": 0
    }
  ],
  "projects": [
    {
      "id": "id original mantido",
      "name": "Nome do projeto",
      "description": "Project description in English...",
      "url": "https://...",
      "highlights": ["Project highlight in English..."],
      "technologies": ["tech1", "tech2"],
      "orderIndex": 0
    }
  ],
  "educations": [
    {
      "id": "id original mantido",
      "institution": "Instituição",
      "degree": "Degree in English",
      "fieldOfStudy": "Field in English or null",
      "startDate": "MM/YYYY",
      "endDate": "MM/YYYY"
    }
  ],
  "certifications": [
    {
      "id": "id original mantido",
      "name": "Certification Name",
      "issuer": "Issuer",
      "issueDate": "MM/YYYY",
      "url": "https://..."
    }
  ]
}
`;

    try {
      const text = await this.generateWithFallback(prompt, 45000);
      this.logger.log(`Raw Gemini English Profile translation (first 1000 chars):\n${text.slice(0, 1000)}`);
      let parsedJson: Partial<MasterProfileDto>;
      try {
        parsedJson = safeParseAiJson<Partial<MasterProfileDto>>(text);
      } catch (err) {
        this.logger.error(`safeParseAiJson FAILED. Full text was:\n${text}`);
        throw err;
      }

      return {
        id: profile.id,
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        location: profile.location,
        linkedinUrl: profile.linkedinUrl,
        githubUrl: profile.githubUrl,
        portfolioUrl: profile.portfolioUrl,
        summary: parsedJson.summary || profile.summary,
        skills: parsedJson.skills?.length ? parsedJson.skills : profile.skills,
        experiences: parsedJson.experiences?.length
          ? parsedJson.experiences.map((exp, idx) => ({
              ...exp,
              id: profile.experiences[idx]?.id || exp.id,
              company: exp.company || profile.experiences[idx]?.company,
              technologies:
                exp.technologies || profile.experiences[idx]?.technologies,
            }))
          : profile.experiences,
        projects: parsedJson.projects?.length
          ? parsedJson.projects.map((proj, idx) => ({
              ...proj,
              id: profile.projects[idx]?.id || proj.id,
              url: profile.projects[idx]?.url,
              technologies:
                proj.technologies || profile.projects[idx]?.technologies,
            }))
          : profile.projects,
        educations: parsedJson.educations?.length
          ? parsedJson.educations.map((ed, idx) => ({
              ...ed,
              id: profile.educations[idx]?.id || ed.id,
              institution:
                ed.institution || profile.educations[idx]?.institution,
            }))
          : profile.educations,
        certifications: parsedJson.certifications?.length
          ? parsedJson.certifications.map((c, idx) => ({
              ...c,
              id: profile.certifications[idx]?.id || c.id,
              issuer: c.issuer || profile.certifications[idx]?.issuer,
              url: profile.certifications[idx]?.url,
            }))
          : profile.certifications,
      };
    } catch (error) {
      this.logger.error(
        "Failed to translate master profile with Gemini",
        error instanceof Error ? error.stack : error,
      );
      throw error;
    }
  }
}


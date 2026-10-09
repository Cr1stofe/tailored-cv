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
  sanitizeHeadline,
  formatResumeDate,
  localizeResumeProjectName,
  normalizePeriod,
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
        if (nextChar === ":" || nextChar === "}" || nextChar === "]") {
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

const PT_THIRD_PERSON_TO_FIRST_PERSON: Array<[RegExp, string]> = [
  [/^Desenvolveu\b/i, "Desenvolvi"],
  [/^Implementou\b/i, "Implementei"],
  [/^Integrou\b/i, "Integrei"],
  [/^Executou\b/i, "Executei"],
  [/^Aprovou\b/i, "Aprovei"],
  [/^Alcançou\b/i, "Alcancei"],
  [/^Construiu\b/i, "Construí"],
  [/^Realizou\b/i, "Realizei"],
  [/^Configurou\b/i, "Configurei"],
  [/^Otimizou\b/i, "Otimizei"],
  [/^Criou\b/i, "Criei"],
  [/^Entregou\b/i, "Entreguei"],
  [/^Manteve\b/i, "Mantive"],
  [/^Liderou\b/i, "Liderei"],
  [/^Garantiu\b/i, "Garanti"],
  [/^Reduziu\b/i, "Reduzi"],
  [/^Melhorou\b/i, "Melhorei"],
  [/^Aumentou\b/i, "Aumentei"],
];

function normalizePortugueseBullet(text: string): string {
  return PT_THIRD_PERSON_TO_FIRST_PERSON.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    text.trim(),
  );
}

function replaceLanguageContamination(
  text: string | null | undefined,
  isEnglish: boolean,
): string {
  if (!text) return "";
  return isEnglish
    ? text
        .replace(/\bAPIs REST\b/gi, "REST APIs")
        .replace(/\bSessões seguras\b/gi, "secure sessions")
    : text
        .replace(/\bREST APIs\b/gi, "APIs REST")
        .replace(/\bsecure cookies\b/gi, "Cookies HttpOnly");
}

function localizeTechnicalTerm(value: string, isEnglish: boolean): string {
  return isEnglish
    ? value.replace(/\bAPIs REST\b/gi, "REST APIs")
    : value.replace(/\bREST APIs\b/gi, "APIs REST");
}

function removeSummaryRepetition(text: string, isEnglish: boolean): string {
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  const metricPattern =
    /\b(?:LCP|Lighthouse|Core Web Vitals|downloads?|download|crash|crashes|100k|100,?000|1[,.]4\s*s|99\s*(?:desktop\s*)?(?:score|performance|nota|points?)|\d+%)/i;
  const weakStandalonePattern = isEnglish
    ? /^(?:experience|experienced)\s+with\b/i
    : /^(?:experiência|experiente)\s+com\b/i;
  const filtered = sentences
    .map((sentence) => sentence.trim())
    .filter((sentence) => !metricPattern.test(sentence))
    .filter((sentence) => !weakStandalonePattern.test(sentence));
  const result = filtered
    .join(" ")
    .replace(/\s{2,}/g, " ")
    .trim();
  return result.length >= 45 ? result : text.trim();
}

function sanitizeGeneratedCopy(text: string, isEnglish: boolean): string {
  const replacements: Array<[RegExp, string]> = isEnglish
    ? [
        [/\bproven track record\b/gi, "experience"],
        [/\bspecialized in\b/gi, "experienced with"],
        [/\bscalable\b/gi, "production"],
        [/\bhigh-performance\b/gi, "production"],
        [/\bintuitive user journeys\b/gi, "user interfaces"],
      ]
    : [
        [/\bproven track record\b/gi, "experiência"],
        [/\bespecialista em\b/gi, "experiência em"],
        [/\bespecialista\b/gi, "profissional com experiência"],
        [/\bescalável(is)?\b/gi, "em produção"],
        [/\balta performance\b/gi, "produção"],
        [/\bjornadas intuitivas\b/gi, "interfaces de usuário"],
      ];
  return replacements.reduce(
    (result, [pattern, replacement]) => result.replace(pattern, replacement),
    text.trim(),
  );
}

function findRelevantProfileSkills(input: TailorResumeInput): string[] {
  const jobText = [
    input.jobDescription,
    ...(input.jobAnalysis?.keywords || []),
    ...(input.jobAnalysis?.requiredSkills || []),
  ]
    .join(" ")
    .toLowerCase();
  return input.masterProfile.skills
    .filter((skill) => jobText.includes(skill.name.toLowerCase()))
    .map((skill) => skill.name);
}

function getHighlightedSkillCap(input: TailorResumeInput): number {
  const signals = new Set(
    [
      ...(input.jobAnalysis?.keywords || []),
      ...(input.jobAnalysis?.requiredSkills || []),
      ...(input.jobAnalysis?.desiredSkills || []),
    ]
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.length >= 3),
  );

  if (signals.size === 0) {
    if (input.jobDescription.length < 500) return 12;
    if (input.jobDescription.length < 1200) return 16;
    return 20;
  }

  if (signals.size <= 4) return 12;
  if (signals.size <= 10) return 16;
  return 20;
}

function ensureSummaryCoverage(
  summary: string,
  input: TailorResumeInput,
  isEnglish: boolean,
): string {
  const relevant = findRelevantProfileSkills(input).slice(0, 5);
  const missing = relevant
    .filter((skill) => !summary.toLowerCase().includes(skill.toLowerCase()))
    .slice(0, 3);
  if (missing.length === 0) return summary;
  const list = missing.join(isEnglish ? ", " : ", ");
  return `${summary.trim()} ${isEnglish ? `Core technologies include ${list}.` : `Tecnologias centrais: ${list}.`}`;
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
Projetos: ${input.masterProfile.projects.map((p) => `${p.name} [${p.technologies.join(", ")}] — ${p.highlights.join("; ")}`).join("; ")}
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
- O currículo gerado DEVE SER 100% EM INGLÊS TÉCNICO FLUENTE (EUA / Mercado Internacional). NENHUMA palavra em português deve permanecer.
- "title" deve ser em inglês (ex: "Tailored Resume — ${input.position} (${input.company})").
- "targetedHeadline" DEVE SER ESTRITAMENTE FUNCIONAL E SEM QUALQUER SENIORIDADE (ex: "Backend Engineer | Node.js, NestJS, Prisma & Clean Architecture" ou "Software Engineer | TypeScript, React & Node.js"). NUNCA inclua palavras como "Senior", "Sênior", "Pleno", "Junior", "Mid-level", "Lead", "Staff". Senioridade não agrega valor no título e distorce a realidade do perfil.
- "reframedSummary" deve ser redigido em inglês formal, conciso e com forte impacto ATS.
- Em "tailoredExperiences", o cargo ("position") DEVE SER TRADUZIDO para o termo padrão em inglês (ex: "Frontend Developer", "Full Stack Developer", "Backend Developer / Engineer"). NUNCA deixe "Desenvolvedor" e NUNCA adicione prefixos de senioridade.
- Em "tailoredExperiences", a localização ("location") DEVE SER EM INGLÊS (ex: "Remote" em vez de "Remoto", "Hybrid" em vez de "Híbrido").
- Em "tailoredExperiences", "period" DEVE ser formatado estritamente como "MM/YYYY – Present" (ex: "07/2023 – Present"). NUNCA use "YYYY-MM" e NUNCA use a palavra "até".
- Em "tailoredProjects", "name" e "description" DEVEM SER EM INGLÊS caso o original esteja em português (ex: "LMS – Full Stack E-Learning Platform (Veltro LMS)", "LMS – Express REST API").
- Todos os bullets ("reframedHighlights") em "tailoredExperiences" e "tailoredProjects" DEVEM SER EM INGLÊS com action verbs fortes (Developed, Engineered, Implemented, Spearheaded, Optimized, Containerized).
- Princípio inegociável: Never invent. Only reframe and faithfully translate.`
      : `DIRETRIZ DE IDIOMA (TARGET LANGUAGE: PORTUGUÊS):
- Gere o conteúdo em Português do Brasil com terminologia técnica padrão de mercado.
- "targetedHeadline" DEVE SER ESTRITAMENTE FUNCIONAL E SEM QUALQUER SENIORIDADE (ex: "Desenvolvedor Frontend | React, TypeScript, SCSS Modules e Next.js" ou "Desenvolvedor Full Stack | React, Node.js e TypeScript"). NUNCA use "Senior", "Sênior", "Pleno", "Junior", "Lead".
- Em "tailoredExperiences", "period" DEVE ser formatado estritamente como "MM/YYYY – Presente" (ex: "07/2023 – Presente") ou "MM/YYYY – MM/YYYY". NUNCA use "YYYY-MM", "(concluído)" e NUNCA use a palavra "até".
- PESSOA E TEMPO VERBAL OBRIGATÓRIO: Use SEMPRE primeira pessoa implícita. Cargo atual (isCurrent=true): presente do indicativo ("Desenvolvo", "Implemento", "Mantenho"). Cargos anteriores: pretérito perfeito ("Desenvolvi", "Implementei", "Otimizei", "Integrei", "Estruturei"). NUNCA use terceira pessoa ("Desenvolveu", "Implementou", "Aprovou", "Integrou", "Alcançou").
- TERMINOLOGIA PT: use "APIs REST", "Sessões seguras", "Cookies HttpOnly". NUNCA misture termos em inglês ("REST APIs", "secure cookies") no documento PT.
- MESMO CONJUNTO DE FATOS: O PT deve conter exatamente os mesmos projetos, experiências e métricas que o EN. Apenas o idioma do texto muda.`;

    const prompt = `
${AI_SYSTEM_PROMPT}

TAREFA: Reestruturar o currículo do candidato para a vaga alvo sem inventar absolutamente nenhum fato, número ou tecnologia.

${languageInstruction}

EMPRESA ALVO: ${input.company}
CARGO ALVO: ${input.position}
DESCRIÇÃO DA VAGA:
"""
${input.jobDescription}
"""

PALAVRAS-CHAVE DA VAGA (OBRIGATÓRIAS / DESEJÁVEIS):
${input.jobAnalysis ? input.jobAnalysis.keywords.join(", ") : "Requisitos da descrição da vaga"}

MASTER PROFILE COMPLETO (BANCO DE FATOS REAIS E INVIOLÁVEIS):
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
Período: ${formatResumeDate(e.startDate)} – ${e.endDate ? formatResumeDate(e.endDate) : e.isCurrent ? (isEnglish ? "Present" : "Presente") : ""}
Localização: ${e.location || (isEnglish ? "Remote" : "Remoto")}
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

DIRETRIZES ESTRITAS DE EXECUÇÃO:

1. HEADLINE (targetedHeadline):
   - Formato: "[Papel Técnico Funcional] | [3 a 4 tecnologias principais da vaga que o candidato domina]".
   - PROIBIDO QUALQUER TERMO DE SENIORIDADE: NUNCA use "Senior", "Sênior", "Pleno", "Junior", "Lead", "Staff".
   - Se o cargo da vaga não for explícito, use o cargo real mais recente do perfil; não invente um novo título.

2. RESUMO PROFISSIONAL (reframedSummary):
   - 3 a 4 linhas em prosa concisa, sem bullets.
   - 1ª frase: cargo funcional + anos de experiência real (calculado das datas reais) + stack principal alinhada à vaga.
   - Não repita no resumo métricas que serão apresentadas na experiência ou nos projetos. O resumo posiciona o candidato; os bullets comprovam o resultado.
   - 2ª e 3ª frases: 2 a 3 competências técnicas centrais da vaga que o candidato domina e o tipo de solução que entrega.
   - ZERO clichês ("proativo", "apaixonado por tecnologia", "interfaces escaláveis" sem dados de sustentação).

3. COMPETÊNCIAS DESTACADAS (highlightedSkills):
   - Selecione entre 12 e 20 tecnologias que a vaga pede ou que ajudam a comprovar aderência, conforme a amplitude dos requisitos. A ordem deve ser a relevância para a vaga.
   - Use o nome exato da vaga quando aplicável (ex: "Next.js", "NestJS", "PostgreSQL").
   - NUNCA inclua tecnologia que não esteja no Master Profile.

4. EXPERIÊNCIA PROFISSIONAL (tailoredExperiences):
   - Cargo: traduza para o padrão funcional (sem senioridade).
   - Período: formato padronizado "${isEnglish ? "MM/YYYY – Present" : "MM/YYYY – Presente"}" ou "MM/YYYY – MM/YYYY".
   - Bullets (reframedHighlights):
     * 3 a 5 bullets para a experiência principal; 2 a 3 para as demais.
     * Fórmula do bullet: Verbo de ação + o que foi feito + tecnologia + resultado/impacto comprovado.
     * Comece cada bullet com verbo de ação diferente e forte (${isEnglish ? "Architected, Developed, Engineered, Optimized, Integrated, Containerized" : "Desenvolvi, Implementei, Otimizei, Integrei, Estruturei, Reduzi"}).
     * NUNCA invente métricas fictícias.

5. PROJETOS RELEVANTES (tailoredProjects):
   - Selecione no máximo 2 a 3 projetos do candidato de maior impacto para esta vaga.
   - Use exatamente o projectId fornecido no Master Profile e mantenha o mesmo conjunto de projetos quando o currículo for regenerado em outro idioma.
   - No campo name, preserve marcas, produtos e nomes próprios, mas traduza descritores genéricos quando isso melhorar o idioma (ex.: "Plataforma de ensino" → "E-Learning Platform").
   - 2 a 3 bullets por projeto, sem repetir os mesmos fatos da experiência profissional. Se um resultado já foi usado na experiência, use o projeto para explicar escopo, arquitetura ou responsabilidade técnica diferente.
   - Mantenha URLs reais se existirem.

Retorne APENAS um JSON válido seguindo estritamente este formato:
{
  "title": "${isEnglish ? `Tailored Resume — ${input.position} (${input.company})` : `Currículo Adaptado — ${input.position} (${input.company})`}",
  "language": "${input.targetLanguage || "PT"}",
  "targetedHeadline": "${isEnglish ? "Backend Engineer | Node.js, NestJS, Prisma & PostgreSQL" : "Engenheiro de Software Backend | Node.js, NestJS, Prisma e PostgreSQL"}",
  "reframedSummary": "${isEnglish ? "Frontend Developer with experience in React, TypeScript and the testing tools evidenced in the profile..." : "Desenvolvedor Frontend com experiência em React, TypeScript e as ferramentas de testes evidenciadas no perfil..."}",
  "highlightedSkills": ["skill1", "skill2", "skill3"],
  "tailoredExperiences": [
    {
      "experienceId": "id original",
      "company": "Company Name",
      "position": "${isEnglish ? "Frontend Developer" : "Desenvolvedor Frontend"}",
      "period": "${isEnglish ? "07/2023 – Present" : "07/2023 – Presente"}",
      "location": "${isEnglish ? "Remote" : "Remoto"}",
      "reframedHighlights": ["${isEnglish ? "Developed a documented solution using the technologies evidenced in the profile..." : "Desenvolvi uma solução documentada usando as tecnologias evidenciadas no perfil..."}"],
      "technologies": ["tech1", "tech2"]
    }
  ],
  "tailoredProjects": [
    {
      "projectId": "id original",
      "name": "${isEnglish ? "LMS – Full Stack E-Learning Platform (Veltro LMS)" : "LMS – Plataforma de ensino Full Stack (Veltro LMS)"}",
      "description": "${isEnglish ? "Corporate modular educational platform with video streaming..." : "Descrição do projeto"}",
      "url": "https://...",
      "reframedHighlights": ["${isEnglish ? "Engineered modular corporate API using NestJS..." : "bullet do projeto"}"],
      "technologies": ["tech1"]
    }
  ]
}
`;

    try {
      const text = await this.generateWithFallback(prompt);
      const parsedJson = safeParseAiJson(text);
      const validated = tailoredResumeOutputSchema.parse(parsedJson);

      const highlightedSkillCap = getHighlightedSkillCap(input);
      const candidateSkills = new Map(
        input.masterProfile.skills.map((skill) => [
          skill.name.trim().toLowerCase(),
          skill.name,
        ]),
      );
      const relevantSkills = findRelevantProfileSkills(input);
      const verifiedSkills = validated.highlightedSkills
        .map((skill) => candidateSkills.get(skill.trim().toLowerCase()))
        .filter((skill): skill is string => Boolean(skill));
      const sanitizedSkills = Array.from(
        new Set([...relevantSkills, ...verifiedSkills]),
      )
        .map((skill) => localizeTechnicalTerm(skill, isEnglish))
        .slice(0, highlightedSkillCap);

      if (validated.highlightedSkills.length > highlightedSkillCap) {
        this.logger.warn(
          `AI returned ${validated.highlightedSkills.length} highlighted skills — capped to ${highlightedSkillCap}.`,
        );
      }

      const bannedAnnotationRe =
        /\s*\((conclu[íi]do|concluded|present|atual)\)/gi;
      const sourceExperiences = new Map(
        input.masterProfile.experiences.map((experience) => [
          experience.id,
          experience,
        ]),
      );
      const sourceProjects = new Map(
        input.masterProfile.projects.map((project) => [project.id, project]),
      );
      const sanitizedExperiences = validated.tailoredExperiences.map((exp) => {
        const source = exp.experienceId
          ? sourceExperiences.get(exp.experienceId)
          : undefined;
        const bullets = exp.reframedHighlights.map((bullet) => {
          const normalized = !isEnglish
            ? normalizePortugueseBullet(bullet)
            : bullet.trim();
          return sanitizeGeneratedCopy(
            replaceLanguageContamination(normalized, isEnglish),
            isEnglish,
          );
        });
        const period = normalizePeriod(exp.period, isEnglish)
          .replace(bannedAnnotationRe, "")
          .trim();
        return {
          ...exp,
          company: source?.company || exp.company,
          experienceId: source?.id || exp.experienceId,
          technologies: (source?.technologies || exp.technologies).map((tech) =>
            localizeTechnicalTerm(tech, isEnglish),
          ),
          reframedHighlights: bullets,
          period,
        };
      });

      const sanitizedProjects = validated.tailoredProjects?.map((project) => {
        const source = project.projectId
          ? sourceProjects.get(project.projectId)
          : undefined;
        return {
          ...project,
          // Preserve brands and product names, but localize generic descriptors.
          name: localizeResumeProjectName(
            source?.name || project.name,
            isEnglish,
          ),
          url: source?.url || project.url,
          projectId: source?.id || project.projectId,
          technologies: (source?.technologies || project.technologies).map(
            (tech) => localizeTechnicalTerm(tech, isEnglish),
          ),
          description: sanitizeGeneratedCopy(
            replaceLanguageContamination(project.description.trim(), isEnglish),
            isEnglish,
          ),
          reframedHighlights: project.reframedHighlights.map((bullet) => {
            const normalized = !isEnglish
              ? normalizePortugueseBullet(bullet)
              : bullet.trim();
            return sanitizeGeneratedCopy(
              replaceLanguageContamination(normalized, isEnglish),
              isEnglish,
            );
          }),
        };
      });

      return {
        ...validated,
        title: replaceLanguageContamination(validated.title, isEnglish),
        targetedHeadline: sanitizeHeadline(
          replaceLanguageContamination(validated.targetedHeadline, isEnglish),
        ),
        reframedSummary: ensureSummaryCoverage(
          removeSummaryRepetition(
            sanitizeGeneratedCopy(
              replaceLanguageContamination(
                validated.reframedSummary,
                isEnglish,
              ),
              isEnglish,
            ),
            isEnglish,
          ),
          input,
          isEnglish,
        ),
        highlightedSkills: sanitizedSkills,
        tailoredExperiences: sanitizedExperiences,
        tailoredProjects: sanitizedProjects,
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
8. Para a localização (location), formate no padrão internacional adicionando o país em inglês (ex: "${profile.location ? `${profile.location}, Brazil` : "City, State, Brazil"}").

DIRETRIZES OBRIGATÓRIAS DE FORMATAÇÃO JSON (ESTRITAS):
- NUNCA use aspas duplas ("...") dentro de resumos, descrições ou bullets de texto. Para citar nomes de projetos, plataformas ou termos use SEMPRE aspas simples ('...'). Exemplo: plataforma 'Ranking dos Políticos' e NUNCA plataforma "Ranking dos Políticos".
- NUNCA inclua quebras de linha literais dentro de strings; use apenas \\n se necessário.
- Todas as chaves e propriedades JSON devem ser delimitadas por aspas duplas padrão.

PERFIL ORIGINAL EM PORTUGUÊS:
${JSON.stringify(
  {
    fullName: profile.fullName,
    location: profile.location,
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
  "location": "${profile.location ? `${profile.location}, Brazil` : "City, State, Brazil"}",
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
      this.logger.log(
        `Raw Gemini English Profile translation (first 1000 chars):\n${text.slice(0, 1000)}`,
      );
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
        location:
          parsedJson.location ||
          (profile.location
            ? profile.location.includes("Brazil")
              ? profile.location
              : `${profile.location}, Brazil`
            : profile.location),
        linkedinUrl: profile.linkedinUrl,
        githubUrl: profile.githubUrl,
        portfolioUrl: profile.portfolioUrl,
        summary: parsedJson.summary || profile.summary,
        // Skills, technologies, IDs, URLs, names and array membership belong
        // to the canonical profile; only prose is translated.
        skills: profile.skills,
        experiences: profile.experiences.map((source, idx) => {
          const translated =
            parsedJson.experiences?.find((item) => item.id === source.id) ||
            parsedJson.experiences?.[idx];
          return {
            ...source,
            ...translated,
            id: source.id,
            company: source.company,
            technologies: source.technologies,
          };
        }),
        projects: profile.projects.map((source, idx) => {
          const translated =
            parsedJson.projects?.find((item) => item.id === source.id) ||
            parsedJson.projects?.[idx];
          return {
            ...source,
            ...translated,
            id: source.id,
            name: source.name,
            url: source.url,
            technologies: source.technologies,
          };
        }),
        educations: parsedJson.educations?.length
          ? parsedJson.educations.map((ed, idx) => ({
              ...ed,
              id: profile.educations[idx]?.id || ed.id,
              institution:
                ed.institution || profile.educations[idx]?.institution,
            }))
          : profile.educations,
        certifications: profile.certifications.map((source, idx) => ({
          ...source,
          ...(parsedJson.certifications?.find(
            (item) => item.id === source.id,
          ) || parsedJson.certifications?.[idx]),
          id: source.id,
          name: source.name,
          url: source.url,
        })),
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

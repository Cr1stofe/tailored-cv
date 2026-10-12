import { Logger } from "@nestjs/common";
import type { JobAnalysisInput, JobAnalysisOutput } from "../../ai.constants";
import { AI_SYSTEM_PROMPT, jobAnalysisOutputSchema } from "../../ai.constants";
import { evaluateJobCompatibility } from "../../resume-quality";
import { GeminiClient } from "./gemini-client";
import { safeParseAiJson } from "./json-parser";

const logger = new Logger("GeminiJobAnalyzer");

export async function analyzeJobWithGemini(
  client: GeminiClient,
  input: JobAnalysisInput,
): Promise<JobAnalysisOutput> {
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
Certificações / Idiomas: ${(input.masterProfile.certifications || []).map((c) => `${c.name} (${c.issuer})`).join(", ") || "Não informado"}
Experiências: ${input.masterProfile.experiences.map((e) => `${e.position} em ${e.company} [${e.technologies.join(", ")}]`).join("; ")}
Projetos: ${input.masterProfile.projects.map((p) => `${p.name} [${p.technologies.join(", ")}] — ${p.highlights.join("; ")}`).join("; ")}
"""

DIRETRIZES DE MATCHING:
- Considere que o candidato possui "JavaScript moderno (ES6+)" se tiver "JavaScript" comprovado.
- Considere que possui "HTML semântico" se tiver "HTML" comprovado.
- Considere atendido requisito de idiomas (ex: "Inglês para leitura/documentação") se o idioma estiver cadastrado.
- Se a vaga listar alternativas (ex: "Redux, Zustand ou Context API") e o candidato possuir uma delas (ex: Zustand), considere como matchingSkill e NÃO como missingSkill.
- Não liste em missingSkills competências que o candidato atende direta ou conceitualmente.

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
    const text = await client.generate(prompt);
    const parsedJson = safeParseAiJson(text);
    const validated = jobAnalysisOutputSchema.parse(parsedJson);
    return evaluateJobCompatibility(input, validated);
  } catch (error) {
    logger.error(
      "Failed to analyze job with Gemini",
      error instanceof Error ? error.stack : error,
    );
    throw error;
  }
}

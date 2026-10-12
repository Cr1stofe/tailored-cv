import { Logger } from "@nestjs/common";
import type { MasterProfileDto } from "@tailored-cv/types";
import { AI_SYSTEM_PROMPT } from "../../ai.constants";
import { GeminiClient } from "./gemini-client";
import { safeParseAiJson } from "./json-parser";

const logger = new Logger("GeminiProfileTranslator");

export async function translateProfileWithGemini(
  client: GeminiClient,
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
    const text = await client.generate(prompt, 45000);
    const parsedJson = safeParseAiJson<Partial<MasterProfileDto>>(text);

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
            institution: ed.institution || profile.educations[idx]?.institution,
          }))
        : profile.educations,
      certifications: profile.certifications.map((source, idx) => ({
        ...source,
        ...(parsedJson.certifications?.find((item) => item.id === source.id) ||
          parsedJson.certifications?.[idx]),
        id: source.id,
        name: source.name,
        url: source.url,
      })),
    };
  } catch (error) {
    logger.error(
      "Failed to translate master profile with Gemini",
      error instanceof Error ? error.stack : error,
    );
    throw error;
  }
}

import { Logger, UnprocessableEntityException } from "@nestjs/common";
import type {
  TailorResumeInput,
  TailoredResumeDraft,
  TailoredResumeOutput,
} from "../../ai.constants";
import {
  AI_SYSTEM_PROMPT,
  formatResumeDate,
  localizeResumeProjectName,
  normalizePeriod,
  tailoredResumeDraftSchema,
  tailoredResumeOutputSchema,
} from "../../ai.constants";
import {
  buildTargetRole,
  findRelevantProfileSkills,
  normalizeTechnology,
  orderTailoredContentByRelevance,
  synchronizeTailoredResume,
  validateTailoredResume,
  withGenerationReport,
} from "../../resume-quality";
import { GeminiClient } from "./gemini-client";
import { safeParseAiJson } from "./json-parser";
import {
  getHighlightedSkillCap,
  localizeTechnicalTerm,
  preserveMasterProductNames,
  preserveMasterSummary,
  replaceLanguageContamination,
  sanitizeGeneratedCopy,
} from "./resume-sanitizer";

const logger = new Logger("GeminiResumeTailor");

const NON_BLOCKING_QUALITY_CODES = new Set([
  "HEADLINE_SUMMARY_MISMATCH",
  "SUMMARY_BODY_MISMATCH",
  "MISSING_RELEVANT_SKILL",
  "IRRELEVANT_ORDER",
  "STRONG_RESULT_OMITTED",
]);

export async function tailorResumeWithGemini(
  client: GeminiClient,
  input: TailorResumeInput,
): Promise<TailoredResumeOutput> {
  const isEnglish = input.targetLanguage === "EN";
  const targetRole = buildTargetRole(input, isEnglish);
  const languageInstruction = isEnglish
    ? `DIRETRIZ OBRIGATÓRIA DE IDIOMA (TARGET LANGUAGE: ENGLISH):
- O currículo gerado DEVE SER 100% EM INGLÊS TÉCNICO FLUENTE (EUA / Mercado Internacional). NENHUMA palavra em português deve permanecer.
- "title" deve ser apenas documental, em inglês: "Tailored Resume — ${input.company}".
- "targetedHeadline" DEVE SER ESTRITAMENTE FUNCIONAL E SEM QUALQUER SENIORIDADE (ex: "Backend Engineer | Node.js, NestJS, Prisma & Clean Architecture" ou "Software Engineer | TypeScript, React & Node.js"). NUNCA inclua palavras como "Senior", "Sênior", "Pleno", "Junior", "Mid-level", "Lead", "Staff". Senioridade não agrega valor no título e distorce a realidade do perfil.
- "reframedSummary" deve ser redigido em inglês formal, conciso e com forte impacto ATS.
- Em "tailoredExperiences", o cargo ("position") DEVE SER TRADUZIDO para o termo padrão em inglês (ex: "Frontend Developer", "Full Stack Developer", "Backend Developer / Engineer"). NUNCA deixe "Desenvolvedor" e NUNCA adicione prefixos de senioridade.
- Em "tailoredExperiences", a localização ("location") DEVE SER EM INGLÊS (ex: "Remote" em vez de "Remoto", "Hybrid" em vez de "Híbrido").
- Em "tailoredExperiences", "period" DEVE ser formatado estritamente como "MM/YYYY – Present" (ex: "07/2023 – Present"). NUNCA use "YYYY-MM" e NUNCA use a palavra "até".
- Em "tailoredProjects", "name" e "description" DEVEM SER EM INGLÊS caso o original esteja em português (ex: "LMS – Full Stack E-Learning Platform (Veltro LMS)", "LMS – Express REST API").
- Todos os bullets devem ser traduções fiéis dos bullets selecionados. Preserve o nível de responsabilidade: "Participei" deve continuar "Participated/Contributed", nunca "Developed/Led".
- Princípio inegociável: Never invent. Only reframe and faithfully translate.`
    : `DIRETRIZ DE IDIOMA (TARGET LANGUAGE: PORTUGUÊS):
- Gere o conteúdo em Português do Brasil com terminologia técnica padrão de mercado.
- "targetedHeadline" DEVE SER ESTRITAMENTE FUNCIONAL E SEM QUALQUER SENIORIDADE (ex: "Desenvolvedor Frontend | React, TypeScript, SCSS Modules e Next.js" ou "Desenvolvedor Full Stack | React, Node.js e TypeScript"). NUNCA use "Senior", "Sênior", "Pleno", "Junior", "Lead".
- Em "tailoredExperiences", "period" DEVE ser formatado estritamente como "MM/YYYY – Presente" (ex: "07/2023 – Presente") ou "MM/YYYY – MM/YYYY". NUNCA use "YYYY-MM", "(concluído)" e NUNCA use a palavra "até".
- BULLETS: copie literalmente os bullets selecionados do Master Profile. Não troque o verbo, o tempo verbal, o nível de autoria, números, contexto de produto ou escopo.
- TERMINOLOGIA PT: use "APIs REST", "Sessões seguras", "Cookies HttpOnly". NUNCA misture termos em inglês ("REST APIs", "secure cookies") no documento PT.
- MESMO CONJUNTO DE FATOS: O PT deve conter exatamente os mesmos projetos, experiências e métricas que o EN. Apenas o idioma do texto muda.`;

  const prompt = `
${AI_SYSTEM_PROMPT}

TAREFA: Reestruturar o currículo do candidato para a vaga alvo sem inventar absolutamente nenhum fato, número ou tecnologia.

${languageInstruction}

EMPRESA ALVO: ${input.company}
CARGO ALVO LIMPO (use esta área, sem copiar o anúncio): ${targetRole}
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
 - Use exatamente o CARGO ALVO LIMPO informado acima, sem copiar a frase original do anúncio e sem acrescentar senioridade.
 - O cabeçalho e o início da primeira frase do resumo devem ser idênticos.
 - PROIBIDO QUALQUER TERMO DE SENIORIDADE: NUNCA use "Senior", "Sênior", "Pleno", "Junior", "Lead", "Staff".
 - Se o cargo da vaga não for explícito, use o cargo real mais recente do perfil; não invente um novo título.
 - Se o cargo da vaga contiver uma tecnologia que não existe no master, NÃO a use na headline. Nesse caso, mantenha o cargo real mais recente e destaque apenas tecnologias comprovadas.

2. RESUMO PROFISSIONAL (reframedSummary):
 - Use o resumo original como base textual obrigatória.
 - Adapte somente a função/área da primeira frase para espelhar a vaga e reordene tecnologias reais quando necessário.
 - Preserve as demais frases, números, métricas e qualificadores que tenham respaldo no corpo final.
 - Toda tecnologia e todo produto citados no resumo devem aparecer em Competências, Experiência ou Projetos. Se cortar um item do corpo, remova também sua menção do resumo.
 - Se o resumo mantiver um produto ou resultado mensurável do master, mantenha também no corpo pelo menos uma evidência correspondente, priorizando Ranking dos Políticos (LCP/Lighthouse) e Motul Expert (downloads) quando houver espaço.
 - Não reescreva do zero, não resuma resultados e não introduza clichês.

3. COMPETÊNCIAS DESTACADAS (highlightedSkills):
 - Selecione entre 12 e 20 tecnologias que a vaga pede ou que ajudam a comprovar aderência, conforme a amplitude dos requisitos. A ordem deve ser a relevância para a vaga.
 - Use o nome exato da vaga quando aplicável (ex: "Next.js", "NestJS", "PostgreSQL").
 - NUNCA inclua tecnologia que não esteja no Master Profile.
 - Inclua backend comprovado quando a vaga mencionar Node.js, endpoints ou atuação full stack: NestJS, Express, Prisma e PostgreSQL, quando existentes no master.
 - Priorize a ordem Frontend, Backend, Testes e DevOps; a interface fará o agrupamento visual sem alterar este array.

4. EXPERIÊNCIA PROFISSIONAL (tailoredExperiences):
 - Cargo: traduza para o padrão funcional (sem senioridade).
 - Período: formato padronizado "${isEnglish ? "MM/YYYY – Present" : "MM/YYYY – Presente"}" ou "MM/YYYY – MM/YYYY".
 - Bullets (reframedHighlights):
   * Selecione de 2 a 4 bullets por experiência para caber em uma página.
   * Em PT, copie literalmente cada bullet do master; em EN, faça tradução fiel.
   * Preserve verbo, autoria, escopo, contexto de produto e métricas. Nunca fortaleça ou enfraqueça responsabilidade.
   * Ordene por relevância: evidências de React/Next.js vêm antes de Flutter numa vaga React; diferenciais pedidos como CI, testes, SSG e SSR ganham prioridade quando comprovados.
   * Só liste em "technologies" tecnologias explicitamente sustentadas por pelo menos um bullet desta experiência.
   * Preserve o link original de qualquer produto mencionado; se ele estiver no bullet de experiência, acrescente a URL ao final.
   * Resultados fortes com métricas, como 100 mil downloads, devem permanecer em um bullet fiel quando ainda couberem na página, mesmo com baixa relevância para a vaga.

5. PROJETOS RELEVANTES (tailoredProjects):
 - Selecione no máximo 2 a 3 projetos do candidato de maior impacto para esta vaga. Em vagas genéricas ou pouco detalhadas, preserve projetos de alta complexidade como Veltro LMS.
 - Use exatamente o projectId fornecido no Master Profile e mantenha o mesmo conjunto de projetos quando o currículo for regenerado em outro idioma.
 - No campo name, preserve marcas, produtos e nomes próprios, mas traduza descritores genéricos quando isso melhorar o idioma (ex.: "Plataforma de ensino" → "E-Learning Platform").
 - Se um projeto comprova requisito obrigatório ou diferencial da vaga, ele tem prioridade sobre projetos genericamente relacionados.
 - Preserve integralmente a descrição de produto/domínio do master.
 - Use somente bullets literais do master em PT ou traduções fiéis em EN.
 - Evite duplicação entre seções: se um projeto já estiver bem representado na Experiência Profissional (como o Ranking dos Políticos com métricas de LCP e Lighthouse), priorize outros projetos de destaque na seção Projetos (como Veltro LMS, Portfólio Pessoal ou Tailored CV).
 - Mantenha URLs reais se existirem.
 - Em "technologies", mantenha as tecnologias comprovadas do projeto que representam sua stack e complexidade técnica.

6. LIMITE E QUALIDADE:
 - Em vagas genéricas ou com poucos requisitos, adote uma postura CONSERVADORA: preserve bullets com métricas, tecnologias e projetos fortes do master sem reduções drásticas.
 - O conteúdo final deve caber em uma página: no máximo 4 bullets de experiência e até 2 projetos com no máximo 2 bullets cada.
 - Use grafia oficial: Next.js, Node.js, TypeScript, JavaScript e GitHub Actions.
 - Antes de responder, confira que nenhum número ou tecnologia ausente do master foi incluído.

Retorne APENAS um JSON válido seguindo estritamente este formato:
{
"title": "${isEnglish ? `Tailored Resume — ${input.company}` : `Currículo Adaptado — ${input.company}`}",
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
    let feedback: string[] = [];
    let lastError: unknown;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const retryInstruction = feedback.length
          ? `\nCORREÇÃO OBRIGATÓRIA DA TENTATIVA ANTERIOR:\n${feedback.map((item) => `- ${item}`).join("\n")}\nGere novamente corrigindo todos os itens, sem alterar fatos válidos.`
          : "";
        const text = await client.generate(`${prompt}${retryInstruction}`);
        const parsedJson = safeParseAiJson(text);
        const validated = tailoredResumeDraftSchema.parse(parsedJson);

        const highlightedSkillCap = getHighlightedSkillCap(input);
        const candidateSkills = new Map(
          input.masterProfile.skills.flatMap((skill) => {
            const baseName = skill.name.replace(/\([^)]*\)/g, "").trim();
            return [
              [normalizeTechnology(skill.name), skill.name],
              [normalizeTechnology(baseName), skill.name],
            ];
          }),
        );
        const relevantSkills = findRelevantProfileSkills(input);
        const verifiedSkills = validated.highlightedSkills
          .map((skill) => candidateSkills.get(normalizeTechnology(skill)))
          .filter((skill): skill is string => Boolean(skill));
        const sanitizedSkills = Array.from(
          new Set([...relevantSkills, ...verifiedSkills]),
        )
          .map((skill) => localizeTechnicalTerm(skill, isEnglish))
          .slice(0, highlightedSkillCap);

        const bannedAnnotationRe =
          /\s*\((conclu[íi]do|concluded|present|atual)\)/gi;
        const sanitizedExperiences = validated.tailoredExperiences.map(
          (experience) => {
            const source = input.masterProfile.experiences.find(
              (candidate) =>
                (experience.experienceId &&
                  candidate.id === experience.experienceId) ||
                candidate.company.toLowerCase() ===
                  experience.company.toLowerCase(),
            );
            return {
              ...experience,
              company: source?.company || experience.company,
              position:
                !isEnglish && source
                  ? source.position
                  : experience.position.trim(),
              experienceId: source?.id || experience.experienceId,
              technologies: (
                source?.technologies || experience.technologies
              ).map((technology) =>
                localizeTechnicalTerm(technology, isEnglish),
              ),
              reframedHighlights: experience.reframedHighlights.map((bullet) =>
                preserveMasterProductNames(
                  replaceLanguageContamination(bullet.trim(), isEnglish),
                  input,
                ),
              ),
              period: normalizePeriod(experience.period, isEnglish)
                .replace(bannedAnnotationRe, "")
                .trim(),
            };
          },
        );

        const sanitizedProjects = validated.tailoredProjects?.map((project) => {
          const source = input.masterProfile.projects.find(
            (candidate) =>
              (project.projectId && candidate.id === project.projectId) ||
              candidate.name.toLowerCase() === project.name.toLowerCase(),
          );
          return {
            ...project,
            name: localizeResumeProjectName(
              source?.name || project.name,
              isEnglish,
            ),
            url: source?.url || project.url,
            projectId: source?.id || project.projectId,
            technologies: (source?.technologies || project.technologies).map(
              (technology) => localizeTechnicalTerm(technology, isEnglish),
            ),
            description:
              !isEnglish && source
                ? source.description
                : sanitizeGeneratedCopy(
                    replaceLanguageContamination(
                      project.description.trim(),
                      isEnglish,
                    ),
                    isEnglish,
                  ),
            reframedHighlights: project.reframedHighlights.map((bullet) =>
              preserveMasterProductNames(
                replaceLanguageContamination(bullet.trim(), isEnglish),
                input,
              ),
            ),
          };
        });

        const sanitized: TailoredResumeDraft = {
          ...validated,
          title: isEnglish
            ? `Tailored Resume — ${input.company}`
            : `Currículo Adaptado — ${input.company}`,
          targetedHeadline: targetRole,
          reframedSummary: preserveMasterSummary(
            preserveMasterProductNames(
              replaceLanguageContamination(
                validated.reframedSummary,
                isEnglish,
              ),
              input,
            ),
            input,
            isEnglish,
          ),
          highlightedSkills: sanitizedSkills,
          tailoredExperiences: sanitizedExperiences,
          tailoredProjects: sanitizedProjects,
          language: input.targetLanguage || "PT",
        };
        const ordered = orderTailoredContentByRelevance(
          synchronizeTailoredResume(sanitized, input),
          input,
        );
        const quality = validateTailoredResume(input, ordered);
        const blockingErrors = quality.errors.filter(
          (issue) => !NON_BLOCKING_QUALITY_CODES.has(issue.code),
        );
        const repairableErrors = quality.errors.filter((issue) =>
          ["SUMMARY_BODY_MISMATCH", "HEADLINE_SUMMARY_MISMATCH"].includes(
            issue.code,
          ),
        );
        if (
          blockingErrors.length > 0 ||
          (repairableErrors.length > 0 && attempt < 2)
        ) {
          feedback = [...blockingErrors, ...repairableErrors].map(
            (issue) => issue.message,
          );
          lastError = new Error(feedback.join(" "));
          logger.warn(
            `Tailored resume failed deterministic validation on attempt ${attempt}: ${feedback.join(" | ")}`,
          );
          continue;
        }

        const acceptedQuality = quality.errors.length
          ? {
              ...quality,
              valid: true,
              warnings: [
                ...quality.warnings,
                ...quality.errors.map((issue) => issue.message),
              ],
            }
          : quality;

        return tailoredResumeOutputSchema.parse(
          withGenerationReport(input, ordered, acceptedQuality),
        );
      } catch (error) {
        lastError = error;
        feedback = [
          error instanceof Error
            ? error.message
            : "A resposta não respeitou o contrato JSON.",
        ];
        if (attempt === 2) break;
      }
    }

    throw new UnprocessableEntityException(
      `A IA não conseguiu gerar um currículo fiel após 2 tentativas: ${lastError instanceof Error ? lastError.message : "falha de validação"}`,
    );
  } catch (error) {
    logger.error(
      "Failed to tailor resume with Gemini",
      error instanceof Error ? error.stack : error,
    );
    throw error;
  }
}

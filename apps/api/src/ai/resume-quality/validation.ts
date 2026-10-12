import type { TailorResumeInput } from "@tailored-cv/types";
import type { TailoredResumeDraft } from "@tailored-cv/validation";
import {
  ResumeQualityIssue,
  ResumeQualityResult,
  SPELLING_RULES,
  PARTICIPATION_VERBS,
  AUTHORSHIP_VERBS,
  SENIORITY_PATTERN,
  STRONG_RESULT_PATTERN,
  normalizeText,
  splitSentences,
  normalizeTechnology,
  masterTechnologySet,
  outputText,
  outputBodyText,
  profileText,
  outputTechnologies,
  extractNumbers,
  tokenize,
  similarity,
  bestSourceBullet,
  containsVerb,
  startsWithVerb,
  technologyAppearsInText,
  profileCoversRequirement,
} from "./core";
import { findRelevantProfileSkills } from "./targeting";
import {
  summaryEvidenceGaps,
  relevanceScore,
  estimateResumeLength,
} from "./synchronization";

export function sourceBulletsForExperience(
  input: TailorResumeInput,
  experienceId: string | undefined,
  company: string,
): string[] {
  return (
    input.masterProfile.experiences.find(
      (experience) =>
        (experienceId && experience.id === experienceId) ||
        normalizeText(experience.company) === normalizeText(company),
    )?.highlights || []
  );
}

export function sourceBulletsForProject(
  input: TailorResumeInput,
  projectId: string | undefined,
  name: string,
): string[] {
  return (
    input.masterProfile.projects.find(
      (project) =>
        (projectId && project.id === projectId) ||
        normalizeText(project.name) === normalizeText(name),
    )?.highlights || []
  );
}

export function validateTailoredResume(
  input: TailorResumeInput,
  output: TailoredResumeDraft,
): ResumeQualityResult {
  const errors: ResumeQualityIssue[] = [];
  const warnings: string[] = [];
  const allowedTechnologies = masterTechnologySet(input.masterProfile);
  const unsupportedTechnologies = [...outputTechnologies(output)].filter(
    (technology) => !allowedTechnologies.has(technology),
  );
  if (unsupportedTechnologies.length > 0) {
    errors.push({
      code: "UNSUPPORTED_TECHNOLOGY",
      message: `Tecnologias ausentes do master: ${unsupportedTechnologies.join(", ")}.`,
    });
  }

  const masterNumbers = extractNumbers(profileText(input.masterProfile));
  const unsupportedNumbers = [...extractNumbers(outputText(output))].filter(
    (number) => !masterNumbers.has(number),
  );
  if (unsupportedNumbers.length > 0) {
    errors.push({
      code: "UNSUPPORTED_NUMBER",
      message: `Números ausentes do master: ${unsupportedNumbers.join(", ")}.`,
    });
  }

  if ((input.targetLanguage || "PT") === "PT" && input.masterProfile.summary) {
    const masterSummarySentences = splitSentences(input.masterProfile.summary);
    const generatedSummary = normalizeText(output.reframedSummary);
    const bodyText = outputBodyText(output);
    const supportedSourceSentences = masterSummarySentences.filter(
      (sentence, index) =>
        index === 0 ||
        summaryEvidenceGaps(input, sentence, bodyText).length === 0,
    );
    const missingSummaryFacts = masterSummarySentences
      .slice(1)
      .filter((sentence) => supportedSourceSentences.includes(sentence))
      .filter(
        (sentence) => !generatedSummary.includes(normalizeText(sentence)),
      );
    const missingSummaryNumbers = [
      ...extractNumbers(supportedSourceSentences.join(" ")),
    ].filter((number) => !extractNumbers(output.reframedSummary).has(number));
    if (missingSummaryFacts.length > 0 || missingSummaryNumbers.length > 0) {
      errors.push({
        code: "SUMMARY_FACT_REMOVED",
        message:
          "O resumo removeu fatos ou números do master; adapte somente a função/área da primeira frase.",
      });
    }
  }

  const renderedText = outputText(output);
  if (/\(\s*\)|\[\s*\]/.test(renderedText)) {
    errors.push({
      code: "EMPTY_DELIMITERS",
      message: 'Remova parênteses ou colchetes vazios, como "()" e "[]".',
    });
  }

  const masterSeniorities = new Set(
    (profileText(input.masterProfile).match(SENIORITY_PATTERN) || []).map(
      normalizeText,
    ),
  );
  SENIORITY_PATTERN.lastIndex = 0;
  const unsupportedSeniorities = [
    ...`${output.targetedHeadline || ""} ${output.reframedSummary}`.matchAll(
      SENIORITY_PATTERN,
    ),
  ]
    .map((match) => normalizeText(match[0]))
    .filter((seniority) => !masterSeniorities.has(seniority));
  if (unsupportedSeniorities.length > 0) {
    errors.push({
      code: "UNSUPPORTED_SENIORITY",
      message: `Senioridade ausente do master no cabeçalho ou resumo: ${Array.from(new Set(unsupportedSeniorities)).join(", ")}.`,
    });
  }

  const headline = normalizeText(output.targetedHeadline || "");
  if (headline && !normalizeText(output.reframedSummary).startsWith(headline)) {
    errors.push({
      code: "HEADLINE_SUMMARY_MISMATCH",
      message:
        "O cabeçalho e a abertura do resumo devem usar exatamente a mesma área funcional limpa da vaga.",
    });
  }

  const summaryBodyGaps = summaryEvidenceGaps(
    input,
    output.reframedSummary,
    outputBodyText(output),
  );
  if (summaryBodyGaps.length > 0) {
    errors.push({
      code: "SUMMARY_BODY_MISMATCH",
      message: `Menções do resumo sem respaldo no corpo: ${summaryBodyGaps.join(", ")}. Inclua a evidência no corpo ou remova a menção do resumo.`,
    });
  }

  for (const [pattern, message] of SPELLING_RULES) {
    pattern.lastIndex = 0;
    if (pattern.test(renderedText)) {
      errors.push({ code: "INVALID_SPELLING", message });
    }
  }

  const isPortuguese = (input.targetLanguage || "PT") === "PT";
  const validateBullets = (
    bullets: string[],
    sourceBullets: string[],
    label: string,
  ) => {
    for (const bullet of bullets) {
      const source = bestSourceBullet(bullet, sourceBullets);
      if (!source || (isPortuguese && source.score < 0.42)) {
        errors.push({
          code: "UNGROUNDED_BULLET",
          message: `${label}: bullet sem correspondência factual suficiente no master: "${bullet}".`,
        });
        continue;
      }
      if (
        containsVerb(source.text, PARTICIPATION_VERBS) &&
        startsWithVerb(bullet, AUTHORSHIP_VERBS)
      ) {
        errors.push({
          code: "RESPONSIBILITY_INFLATION",
          message: `${label}: preserve o nível de responsabilidade de "${source.text}"; não use "${bullet}".`,
        });
      }
    }
  };

  for (const experience of output.tailoredExperiences) {
    validateBullets(
      experience.reframedHighlights,
      sourceBulletsForExperience(
        input,
        experience.experienceId,
        experience.company,
      ),
      experience.company,
    );
    const scores = experience.reframedHighlights.map((bullet) =>
      relevanceScore(bullet, input),
    );
    if (
      scores.some((score, index) => index > 0 && score > scores[index - 1]!)
    ) {
      errors.push({
        code: "IRRELEVANT_ORDER",
        message: `${experience.company}: ordene os bullets do mais relevante para o menos relevante para a vaga.`,
      });
    }
    const unsupportedSectionTechnologies = experience.technologies.filter(
      (technology) =>
        !technologyAppearsInText(
          technology,
          experience.reframedHighlights.join(" "),
        ),
    );
    if (unsupportedSectionTechnologies.length > 0) {
      errors.push({
        code: "UNSUPPORTED_SECTION_TECHNOLOGY",
        message: `${experience.company}: tecnologias sem respaldo nos bullets da seção: ${unsupportedSectionTechnologies.join(", ")}.`,
      });
    }
  }

  for (const project of output.tailoredProjects || []) {
    validateBullets(
      project.reframedHighlights,
      sourceBulletsForProject(input, project.projectId, project.name),
      project.name,
    );
    const sourceProject = input.masterProfile.projects.find(
      (candidate) =>
        (project.projectId && candidate.id === project.projectId) ||
        normalizeText(candidate.name) === normalizeText(project.name),
    );
    const evidence = `${project.description || ""} ${project.reframedHighlights.join(" ")}`;
    const sourceTechs = new Set(
      (sourceProject?.technologies || []).map(normalizeTechnology),
    );
    const unsupportedSectionTechnologies = project.technologies.filter(
      (technology) =>
        !technologyAppearsInText(technology, evidence) &&
        !sourceTechs.has(normalizeTechnology(technology)),
    );
    if (unsupportedSectionTechnologies.length > 0) {
      errors.push({
        code: "UNSUPPORTED_SECTION_TECHNOLOGY",
        message: `${project.name}: tecnologias sem respaldo nos bullets da seção: ${unsupportedSectionTechnologies.join(", ")}.`,
      });
    }
  }

  const selectedProjectIds = new Set(
    (output.tailoredProjects || [])
      .map((project) => project.projectId)
      .filter(Boolean),
  );
  for (const project of input.masterProfile.projects.filter(
    (candidate) => candidate.url,
  )) {
    const mentionedInExperience = output.tailoredExperiences.some(
      (experience) =>
        normalizeText(experience.reframedHighlights.join(" ")).includes(
          normalizeText(project.name),
        ),
    );
    const selectedProject = (output.tailoredProjects || []).find(
      (candidate) =>
        (candidate.projectId && candidate.projectId === project.id) ||
        normalizeText(candidate.name) === normalizeText(project.name),
    );
    if (
      (mentionedInExperience ||
        (project.id
          ? selectedProjectIds.has(project.id)
          : Boolean(selectedProject))) &&
      project.url &&
      !outputText(output).includes(project.url)
    ) {
      errors.push({
        code: "MISSING_PROJECT_LINK",
        message: `O produto/projeto ${project.name} foi mantido sem seu link original: ${project.url}.`,
      });
    }
  }

  const mandatoryTargetRequirements = (
    input.jobAnalysis?.requiredSkills || []
  ).filter((req) => profileCoversRequirement(input.masterProfile, req));

  const missingMandatorySkills = mandatoryTargetRequirements.filter((req) => {
    return !output.highlightedSkills.some((selected) => {
      const normSelected = normalizeTechnology(selected);
      const normReq = normalizeTechnology(req);
      return (
        normSelected === normReq ||
        normalizeText(req).includes(normalizeText(selected)) ||
        normalizeText(selected).includes(normalizeText(req))
      );
    });
  });

  if (missingMandatorySkills.length > 0) {
    errors.push({
      code: "MISSING_RELEVANT_SKILL",
      message: `Competências obrigatórias comprovadas da vaga ausentes de Competências: ${missingMandatorySkills.join(", ")}.`,
    });
  }

  const sourceProjectsByRelevance = input.masterProfile.projects
    .map((project) => ({
      project,
      score: relevanceScore(
        `${project.name} ${project.description} ${project.technologies.join(" ")} ${project.highlights.join(" ")}`,
        input,
      ),
    }))
    .sort((a, b) => b.score - a.score);
  const experienceEvidence = normalizeText(
    output.tailoredExperiences
      .flatMap((experience) => experience.reframedHighlights)
      .join(" "),
  );
  const priorityProjects = sourceProjectsByRelevance
    .filter(
      ({ project, score }) =>
        score > 0 && !experienceEvidence.includes(normalizeText(project.name)),
    )
    .slice(0, 2);
  for (const priority of priorityProjects) {
    const selected = (output.tailoredProjects || []).some(
      (project) =>
        (project.projectId && project.projectId === priority.project.id) ||
        normalizeText(project.name) === normalizeText(priority.project.name),
    );
    if (!selected) {
      warnings.push(
        `Projeto relevante omitido para manter foco ou limite de uma página: ${priority.project.name}.`,
      );
    }
  }

  const experienceBullets = output.tailoredExperiences.flatMap(
    (experience) => experience.reframedHighlights,
  );
  const projectBullets = (output.tailoredProjects || []).flatMap(
    (project) => project.reframedHighlights,
  );
  for (const experienceBullet of experienceBullets) {
    for (const projectBullet of projectBullets) {
      const sharedNumbers = [...extractNumbers(experienceBullet)].some(
        (number) => extractNumbers(projectBullet).has(number),
      );
      const left = tokenize(experienceBullet);
      const right = tokenize(projectBullet);
      const tokenOverlap = [...left].filter((t) => right.has(t)).length;
      if (
        similarity(experienceBullet, projectBullet) >= 0.72 ||
        (sharedNumbers &&
          (similarity(experienceBullet, projectBullet) >= 0.2 ||
            tokenOverlap >= 2)) ||
        tokenOverlap >= 5
      ) {
        const message = `Resultado duplicado entre experiência e projeto: "${experienceBullet}".`;
        if ((input.targetLanguage || "PT") === "EN") {
          warnings.push(message);
        } else {
          errors.push({
            code: "DUPLICATED_RESULT",
            message,
          });
        }
      }
    }
  }

  const length = estimateResumeLength(output);
  const selectedBody = normalizeText(outputBodyText(output));
  const omittedStrongResults = input.masterProfile.experiences.flatMap(
    (experience) =>
      experience.highlights.filter(
        (bullet) =>
          STRONG_RESULT_PATTERN.test(bullet) &&
          !selectedBody.includes(normalizeText(bullet)),
      ),
  );
  const omittedStrongResultThatFits = omittedStrongResults.find((bullet) => {
    const additionalLines = Math.max(1, Math.ceil(bullet.length / 105));
    const additionalWords = bullet.split(/\s+/).filter(Boolean).length;
    return (
      length.estimatedLines + additionalLines <= 62 &&
      length.wordCount + additionalWords <= 700
    );
  });
  if (omittedStrongResultThatFits) {
    errors.push({
      code: "STRONG_RESULT_OMITTED",
      message: `Resultado forte que ainda cabe em uma página foi omitido: "${omittedStrongResultThatFits}". Mantenha-o de forma fiel e compacta.`,
    });
  }
  if (length.estimatedLines > 62 || length.wordCount > 700) {
    errors.push({
      code: "PAGE_LENGTH",
      message: `Conteúdo estimado em ${length.estimatedLines} linhas/${length.wordCount} palavras; reduza para uma página.`,
    });
  } else if (length.estimatedLines > 56 || length.wordCount > 620) {
    warnings.push(
      `Currículo próximo do limite de uma página: ${length.estimatedLines} linhas estimadas e ${length.wordCount} palavras.`,
    );
  }
  if (!input.jobAnalysis) {
    warnings.push(
      "Relatório de cobertura calculado sem análise estruturada da vaga.",
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    ...length,
  };
}

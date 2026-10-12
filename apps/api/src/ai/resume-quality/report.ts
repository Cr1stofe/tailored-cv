import type {
  JobAnalysisInput,
  MasterProfileDto,
  TailorResumeInput,
  TailoringReport,
} from "@tailored-cv/types";
import type {
  JobAnalysisOutput,
  TailoredResumeDraft,
  TailoredResumeOutput,
} from "@tailored-cv/validation";
import {
  ResumeQualityResult,
  RELATED_TECH_FAMILIES,
  STOP_WORDS,
  normalizeText,
  normalizeTechnology,
  masterTechnologySet,
  profileText,
  jobTerms,
  profileCoversRequirement,
} from "./core";
import {} from "./targeting";
import { relevanceScore } from "./synchronization";
import {} from "./validation";

export { profileCoversRequirement };

export function selectedSourceText(output: TailoredResumeDraft): string {
  return normalizeText(
    [
      ...output.tailoredExperiences.flatMap(
        (experience) => experience.reframedHighlights,
      ),
      ...(output.tailoredProjects || []).flatMap((project) => [
        project.name,
        project.description,
        ...project.reframedHighlights,
      ]),
    ].join(" "),
  );
}

export function buildTailoringReport(
  input: TailorResumeInput,
  output: TailoredResumeDraft,
  warnings: string[] = [],
): TailoringReport {
  const selectedText = selectedSourceText(output);
  const terms = jobTerms(input);
  const highlighted = [
    ...output.tailoredExperiences.flatMap((experience) =>
      experience.reframedHighlights.map((bullet) => ({
        item: bullet,
        evidence: bullet,
        score: relevanceScore(bullet, input),
      })),
    ),
    ...(output.tailoredProjects || []).map((project) => ({
      item: project.name,
      evidence: `${project.name} ${project.description} ${project.technologies.join(" ")} ${project.reframedHighlights.join(" ")}`,
      score: relevanceScore(
        `${project.name} ${project.description} ${project.technologies.join(" ")}`,
        input,
      ),
    })),
  ]
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ item, evidence }) => {
      const normalizedItem = ` ${normalizeText(evidence)} `;
      const matches = terms.filter((term) =>
        normalizedItem.includes(` ${term} `),
      );
      return {
        item,
        reason: matches.length
          ? `Evidencia ${matches.slice(0, 3).join(", ")}, requisitos presentes na vaga.`
          : "Apresenta evidência relevante para as responsabilidades da vaga.",
      };
    });

  const removed = [
    ...input.masterProfile.experiences.flatMap((experience) =>
      experience.highlights.map((bullet) => ({
        item: bullet,
        selected: selectedText.includes(normalizeText(bullet)),
      })),
    ),
    ...input.masterProfile.projects.map((project) => ({
      item: project.name,
      selected: (output.tailoredProjects || []).some(
        (selected) =>
          (selected.projectId && selected.projectId === project.id) ||
          normalizeText(selected.name) === normalizeText(project.name),
      ),
    })),
  ]
    .filter(({ selected }) => !selected)
    .map(({ item }) => ({
      item,
      reason:
        "Cortado por menor relevância relativa ou para manter uma página.",
    }));

  const required = input.jobAnalysis?.requiredSkills || [];
  const desired = input.jobAnalysis?.desiredSkills || [];
  const coveredRequired = required.filter((requirement) =>
    profileCoversRequirement(input.masterProfile, requirement),
  );
  const coveredDesired = desired.filter((requirement) =>
    profileCoversRequirement(input.masterProfile, requirement),
  );
  const uncoveredRequirements = [
    ...required
      .filter(
        (requirement) =>
          !profileCoversRequirement(input.masterProfile, requirement),
      )
      .map((requirement) => `Obrigatório: ${requirement}`),
    ...desired
      .filter(
        (requirement) =>
          !profileCoversRequirement(input.masterProfile, requirement),
      )
      .map((requirement) => `Diferencial: ${requirement}`),
  ];
  const matchScore =
    required.length > 0
      ? Math.round((coveredRequired.length / required.length) * 100)
      : desired.length > 0
        ? Math.round((coveredDesired.length / desired.length) * 100)
        : 100;

  const matchExplanation =
    required.length === 0
      ? desired.length === 0
        ? "A vaga não possui requisitos estruturados; aderência calculada com base no escopo geral."
        : `${coveredDesired.length} de ${desired.length} diferenciais atendidos (${matchScore}%).`
      : `${coveredRequired.length} de ${required.length} requisitos obrigatórios possuem evidência no master (${matchScore}%). ${coveredDesired.length} de ${desired.length} diferenciais atendidos.`;

  return {
    highlighted,
    removed,
    uncovered_requirements: uncoveredRequirements,
    match_score: matchScore,
    match_explanation: matchExplanation,
    warnings,
  };
}

export function withGenerationReport(
  input: TailorResumeInput,
  output: TailoredResumeDraft,
  quality: ResumeQualityResult,
): TailoredResumeOutput {
  return {
    ...output,
    generationReport: buildTailoringReport(input, output, quality.warnings),
  };
}

export function findPartialSkillCoverage(
  profile: MasterProfileDto,
  requirement: string,
): {
  requirement: string;
  relatedCandidateSkill: string;
  domain: string;
} | null {
  const normReq = normalizeText(requirement);
  for (const family of RELATED_TECH_FAMILIES) {
    const matchingReqVariant = family.variants.find(([, regex]) =>
      regex.test(normReq),
    );
    if (!matchingReqVariant) continue;

    const profileSkills = profile.skills.map((s) => s.name);
    const candidateVariants: string[] = [];

    for (const [name, regex] of family.variants) {
      if (name === matchingReqVariant[0]) continue;
      if (profileSkills.some((ps) => regex.test(normalizeText(ps)))) {
        candidateVariants.push(name);
      }
    }

    if (candidateVariants.length > 0) {
      return {
        requirement,
        relatedCandidateSkill: candidateVariants.join(" / "),
        domain: family.domain,
      };
    }
  }
  return null;
}

export function evaluateJobCompatibility(
  input: JobAnalysisInput,
  rawAiOutput: Partial<JobAnalysisOutput>,
): JobAnalysisOutput {
  const required = (rawAiOutput.requiredSkills || [])
    .map((s) => s.trim())
    .filter(Boolean);
  const desired = (rawAiOutput.desiredSkills || [])
    .map((s) => s.trim())
    .filter(Boolean);

  const coveredRequired: string[] = [];
  const missingRequired: string[] = [];
  const partialCoverages: Array<{
    requirement: string;
    relatedCandidateSkill: string;
    domain: string;
  }> = [];

  for (const req of required) {
    if (profileCoversRequirement(input.masterProfile, req)) {
      coveredRequired.push(req);
    } else {
      missingRequired.push(req);
      const partial = findPartialSkillCoverage(input.masterProfile, req);
      if (partial) {
        partialCoverages.push(partial);
      }
    }
  }

  const coveredDesired: string[] = [];
  const missingDesired: string[] = [];

  for (const des of desired) {
    if (profileCoversRequirement(input.masterProfile, des)) {
      coveredDesired.push(des);
    } else {
      missingDesired.push(des);
      const partial = findPartialSkillCoverage(input.masterProfile, des);
      if (
        partial &&
        !partialCoverages.some(
          (p) => p.requirement.toLowerCase() === des.toLowerCase(),
        )
      ) {
        partialCoverages.push(partial);
      }
    }
  }

  const matchScore =
    required.length > 0
      ? Math.round((coveredRequired.length / required.length) * 100)
      : desired.length > 0
        ? Math.round((coveredDesired.length / desired.length) * 100)
        : 100;

  const incompatibilities: string[] = [];
  const fullJobText = `${input.position} ${input.jobDescription}`;

  // 1. Incompatibilidade de Senioridade
  const requestedSeniority = rawAiOutput.seniorityLevel || "";
  const seniorPattern =
    /\b(especialista|staff|principal|head|tech\s+lead|lideran[çc]a)\b/i;
  const isHighSeniorityRequested =
    seniorPattern.test(requestedSeniority) ||
    seniorPattern.test(input.position);
  const masterSeniorityText = `${input.masterProfile.summary || ""} ${input.masterProfile.experiences.map((e) => e.position).join(" ")}`;
  const candidateHasExecutiveSeniority =
    seniorPattern.test(masterSeniorityText);

  if (isHighSeniorityRequested && !candidateHasExecutiveSeniority) {
    incompatibilities.push(
      "Senioridade: a oportunidade requer nível Especialista/Staff/Liderança formal, enquanto o histórico comprova atuação Pleno/Sênior como especialista técnico individual.",
    );
  }

  // 2. Incompatibilidade de Localização e Modalidade de Trabalho
  const masterLocation = (input.masterProfile.location || "").toLowerCase();
  const requiresOnsite = /\b(presencial|h[ií]brido|100%\s*presencial)\b/i.test(
    fullJobText,
  );
  const mentionsRemote =
    /\b(remoto|100%\s*remoto|anywhere|home\s*office)\b/i.test(fullJobText);

  if (requiresOnsite && !mentionsRemote) {
    const jobCityMatch = fullJobText.match(
      /\b(?:em|na cidade de|base em)\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-zà-ú]+(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-zà-ú]+)*)/,
    );
    const city = jobCityMatch ? jobCityMatch[1] : "localidade específica";
    if (masterLocation && !masterLocation.includes(city?.toLowerCase() || "")) {
      incompatibilities.push(
        `Modalidade/Localização: a vaga exige atuação Presencial ou Híbrida (${city}), incompatível com a atuação remota do perfil.`,
      );
    }
  }

  // 3. Incompatibilidade de Idioma
  const requiresFluentEnglish =
    /\b(?:ingl[êe]s\s+(?:fluente|avan[çc]ado)|fluent\s+english|advanced\s+english|c1|c2)\b/i.test(
      fullJobText,
    );
  if (requiresFluentEnglish) {
    incompatibilities.push(
      "Idioma: a vaga exige Inglês Fluente/Avançado para conversação diária, enquanto o perfil possui proficiência Intermediária técnica.",
    );
  }

  let recommendationType:
    "Aplicar" | "Aplicar com ressalvas" | "Não recomendado";
  let recommendationReason: string;

  if (incompatibilities.length > 0 && (requiresOnsite || matchScore < 50)) {
    recommendationType = "Não recomendado";
    recommendationReason = `Incompatibilidade crítica identificada (${incompatibilities[0]}) com compatibilidade técnica obrigatória de ${matchScore}%.`;
  } else if (matchScore < 50) {
    recommendationType = "Não recomendado";
    recommendationReason = `Aderência aos requisitos obrigatórios abaixo de 50% (${coveredRequired.length} de ${required.length}).`;
  } else if (
    matchScore < 80 ||
    partialCoverages.length > 0 ||
    incompatibilities.length > 0
  ) {
    recommendationType = "Aplicar com ressalvas";
    const details: string[] = [];
    if (matchScore < 80) details.push(`score obrigatório de ${matchScore}%`);
    if (partialCoverages.length > 0)
      details.push(
        `${partialCoverages.length} requisito(s) com cobertura conceitual parcial`,
      );
    if (incompatibilities.length > 0)
      details.push("ressalvas de perfil/contexto");
    recommendationReason = `Compatibilidade moderada (${details.join(", ")}).`;
  } else {
    recommendationType = "Aplicar";
    recommendationReason = `Alta compatibilidade técnica (${matchScore}% dos obrigatórios atendidos) sem incompatibilidades eliminatórias.`;
  }

  const strategicRecommendations: string[] = [
    `Recomendação: ${recommendationType} — ${recommendationReason}`,
    `Aderência técnica: ${coveredRequired.length} de ${required.length} requisitos obrigatórios atendidos (${matchScore}%). Diferenciais atendidos: ${coveredDesired.length} de ${desired.length}.`,
  ];

  if (partialCoverages.length > 0) {
    strategicRecommendations.push(
      `Coberturas parciais: ${partialCoverages.map((p) => `${p.requirement} (perfil possui ${p.relatedCandidateSkill} em ${p.domain})`).join("; ")}. Tecnologias similares não foram tratadas como equivalência completa.`,
    );
  }

  if (incompatibilities.length > 0) {
    for (const incomp of incompatibilities) {
      strategicRecommendations.push(`Alerta de incompatibilidade: ${incomp}`);
    }
  }

  if (rawAiOutput.strategicRecommendations) {
    for (const rec of rawAiOutput.strategicRecommendations) {
      if (
        strategicRecommendations.length < 5 &&
        !strategicRecommendations.some((existing) =>
          existing.toLowerCase().includes(rec.slice(0, 20).toLowerCase()),
        ) &&
        !rec.toLowerCase().startsWith("recomendação:")
      ) {
        strategicRecommendations.push(rec);
      }
    }
  }

  return {
    summary:
      rawAiOutput.summary ||
      `Oportunidade para ${input.position} na empresa ${input.company}.`,
    seniorityLevel: rawAiOutput.seniorityLevel || "Pleno / Sênior",
    requiredSkills: required,
    desiredSkills: desired,
    keyResponsibilities: rawAiOutput.keyResponsibilities || [],
    keywords: rawAiOutput.keywords || [],
    matchScore,
    matchingSkills: [...coveredRequired, ...coveredDesired],
    missingSkills: [...missingRequired, ...missingDesired],
    strategicRecommendations,
  };
}

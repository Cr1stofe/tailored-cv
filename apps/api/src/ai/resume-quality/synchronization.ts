import type {
  TailorResumeInput,
  TailoredProjectItem,
} from "@tailored-cv/types";
import type { TailoredResumeDraft } from "@tailored-cv/validation";
import {
  STRONG_RESULT_PATTERN,
  normalizeText,
  splitSentences,
  normalizeTechnology,
  outputText,
  outputBodyText,
  extractNumbers,
  tokenize,
  similarity,
  jobTerms,
  technologyAppearsInText,
} from "./core";
import { buildTargetRole, findRelevantProfileSkills } from "./targeting";

export function sourceProjectForMention(
  input: TailorResumeInput,
  text: string,
) {
  const normalized = normalizeText(text);
  return input.masterProfile.projects.filter((project) =>
    normalized.includes(normalizeText(project.name)),
  );
}

export function appendSourceLinks(
  input: TailorResumeInput,
  bullet: string,
): string {
  return sourceProjectForMention(input, bullet).reduce((result, project) => {
    if (!project.url || result.includes(project.url)) return result;
    return `${result} (${project.url})`;
  }, bullet);
}

export function sectionTechnologiesSupportedByBullets(
  technologies: string[],
  bullets: string[],
): string[] {
  const evidence = bullets.join(" ");
  return technologies.filter((technology) =>
    technologyAppearsInText(technology, evidence),
  );
}

export function summaryEvidenceGaps(
  input: TailorResumeInput,
  summaryText: string,
  bodyText: string,
): string[] {
  const missingTechnologies = input.masterProfile.skills
    .map((skill) => skill.name)
    .filter((technology) => technologyAppearsInText(technology, summaryText))
    .filter((technology) => !technologyAppearsInText(technology, bodyText));
  const normalizedSummary = normalizeText(summaryText);
  const normalizedBody = normalizeText(bodyText);
  const missingProjects = input.masterProfile.projects
    .filter((project) =>
      normalizedSummary.includes(normalizeText(project.name)),
    )
    .filter((project) => !normalizedBody.includes(normalizeText(project.name)))
    .map((project) => project.name);
  return Array.from(new Set([...missingTechnologies, ...missingProjects]));
}

export function pruneUnsupportedSummarySentences(
  output: TailoredResumeDraft,
  input: TailorResumeInput,
): TailoredResumeDraft {
  if ((input.targetLanguage || "PT") !== "PT") return output;
  const sentences = splitSentences(output.reframedSummary);
  if (sentences.length <= 1) return output;
  const bodyText = outputBodyText(output);
  const filtered = sentences.filter(
    (sentence, index) =>
      index === 0 ||
      summaryEvidenceGaps(input, sentence, bodyText).length === 0,
  );
  return {
    ...output,
    reframedSummary: filtered.map((sentence) => sentence.trim()).join(" "),
  };
}

export function ensureStrongResults(
  output: TailoredResumeDraft,
  input: TailorResumeInput,
): TailoredResumeDraft {
  const selected = normalizeText(outputBodyText(output));
  const strongSources = input.masterProfile.experiences.flatMap((experience) =>
    experience.highlights
      .filter((bullet) => STRONG_RESULT_PATTERN.test(bullet))
      .map((bullet) => ({ experience, bullet })),
  );
  const experiences = output.tailoredExperiences.map((experience) => ({
    ...experience,
    reframedHighlights: [...experience.reframedHighlights],
  }));
  for (const { experience: source, bullet } of strongSources) {
    if (selected.includes(normalizeText(bullet))) continue;
    if ((input.targetLanguage || "PT") === "EN") continue;
    const target = experiences.find(
      (experience) =>
        (experience.experienceId && experience.experienceId === source.id) ||
        normalizeText(experience.company) === normalizeText(source.company),
    );
    if (!target) continue;
    const candidate = appendSourceLinks(input, bullet);
    const withCandidate = {
      ...output,
      tailoredExperiences: experiences.map((experience) =>
        experience === target
          ? {
              ...experience,
              reframedHighlights: [...experience.reframedHighlights, candidate],
            }
          : experience,
      ),
    };
    if (estimateResumeLength(withCandidate).estimatedLines <= 62) {
      target.reframedHighlights.push(candidate);
      if (target.reframedHighlights.length > 4) {
        target.reframedHighlights = target.reframedHighlights
          .map((item) => ({
            item,
            score:
              relevanceScore(item, input) +
              (STRONG_RESULT_PATTERN.test(item) ? 2 : 0),
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 4)
          .map(({ item }) => item);
      }
    }
  }
  return { ...output, tailoredExperiences: experiences };
}

function deduplicateBullets(bullets: string[]): string[] {
  return bullets.filter((bullet, index) => {
    const bulletNumbers = extractNumbers(bullet);
    const bulletTokens = tokenize(bullet);
    return !bullets.slice(0, index).some((previous) => {
      const previousNumbers = extractNumbers(previous);
      const sharedNumbers = [...bulletNumbers].some((number) =>
        previousNumbers.has(number),
      );
      const tokenOverlap = [...bulletTokens].filter((token) =>
        tokenize(previous).has(token),
      ).length;
      return (
        similarity(previous, bullet) >= 0.82 ||
        (sharedNumbers && tokenOverlap >= 2)
      );
    });
  });
}

export function synchronizeTailoredResume(
  output: TailoredResumeDraft,
  input: TailorResumeInput,
): TailoredResumeDraft {
  const role = buildTargetRole(input, input.targetLanguage === "EN");
  const summary = normalizeText(output.reframedSummary).startsWith(
    normalizeText(role),
  )
    ? output.reframedSummary
    : output.reframedSummary.replace(
        /^(?:Pessoa\s+)?(?:Desenvolvedor(?:a)?|Engenheiro(?:a)?|Programador(?:a)?)[^.]*?(?=\s+com\b)/i,
        role,
      );
  const relevantSkills = findRelevantProfileSkills(input);
  const summarySkills = input.masterProfile.skills
    .map((skill) => skill.name)
    .filter((skill) => technologyAppearsInText(skill, summary));
  let synchronized = ensureStrongResults(
    {
      ...output,
      targetedHeadline: role,
      reframedSummary: summary,
      highlightedSkills: Array.from(
        new Set([
          ...relevantSkills,
          ...summarySkills,
          ...output.highlightedSkills,
        ]),
      ).slice(0, 20),
    },
    input,
  );
  const experienceText = normalizeText(
    synchronized.tailoredExperiences
      .flatMap((exp) => exp.reframedHighlights)
      .join(" "),
  );

  const rawProjects = synchronized.tailoredProjects
    ? [...synchronized.tailoredProjects]
    : [];

  const experienceBullets = synchronized.tailoredExperiences.flatMap(
    (exp) => exp.reframedHighlights,
  );

  const selectedProjectIds = new Set<string>();
  const selectedProjectNames = new Set<string>();
  const desduplicatedProjects: TailoredProjectItem[] = [];

  for (const project of rawProjects) {
    const normName = normalizeText(project.name);
    const projId = project.projectId;

    if (
      (projId && selectedProjectIds.has(projId)) ||
      selectedProjectNames.has(normName)
    ) {
      continue;
    }

    const isProjectMentionedInExp = experienceText.includes(normName);
    let finalProject = project;

    if (isProjectMentionedInExp) {
      const hasDuplicateMetric = project.reframedHighlights.some((pBullet) => {
        const pNumbers = extractNumbers(pBullet);
        const right = tokenize(pBullet);
        return experienceBullets.some((eBullet) => {
          const eNumbers = extractNumbers(eBullet);
          const sharesNumber = [...pNumbers].some((n) => eNumbers.has(n));
          const left = tokenize(eBullet);
          const tokenOverlap = [...left].filter((t) => right.has(t)).length;
          return (
            similarity(eBullet, pBullet) >= 0.72 ||
            (sharesNumber &&
              (similarity(eBullet, pBullet) >= 0.2 || tokenOverlap >= 2)) ||
            tokenOverlap >= 5
          );
        });
      });

      if (hasDuplicateMetric) {
        const alternativeProject = input.masterProfile.projects.find(
          (candidate) => {
            const candidateNormalized = normalizeText(candidate.name);
            return (
              !experienceText.includes(candidateNormalized) &&
              !(candidate.id && selectedProjectIds.has(candidate.id)) &&
              !selectedProjectNames.has(candidateNormalized) &&
              candidate.id !== project.projectId &&
              candidateNormalized !== normName
            );
          },
        );

        if (alternativeProject) {
          finalProject = {
            projectId: alternativeProject.id,
            name: alternativeProject.name,
            description: alternativeProject.description,
            url: alternativeProject.url || undefined,
            reframedHighlights: alternativeProject.highlights.slice(0, 2),
            technologies: alternativeProject.technologies,
          };
        }
      }
    }

    if (finalProject.projectId) {
      selectedProjectIds.add(finalProject.projectId);
    }
    selectedProjectNames.add(normalizeText(finalProject.name));
    desduplicatedProjects.push(finalProject);
  }

  synchronized = {
    ...synchronized,
    tailoredExperiences: synchronized.tailoredExperiences.map((experience) => {
      const reframedHighlights = deduplicateBullets(
        experience.reframedHighlights.map((bullet) =>
          appendSourceLinks(input, bullet),
        ),
      );
      return {
        ...experience,
        reframedHighlights,
        technologies: sectionTechnologiesSupportedByBullets(
          experience.technologies,
          reframedHighlights,
        ),
      };
    }),
    tailoredProjects: desduplicatedProjects.map((project) => {
      const source = input.masterProfile.projects.find(
        (candidate) =>
          (project.projectId && candidate.id === project.projectId) ||
          normalizeText(candidate.name) === normalizeText(project.name),
      );
      const evidence = `${project.description || ""} ${project.reframedHighlights.join(" ")}`;
      const sourceTechs = new Set(
        (source?.technologies || []).map(normalizeTechnology),
      );
      return {
        ...project,
        technologies: project.technologies.filter(
          (tech: string) =>
            technologyAppearsInText(tech, evidence) ||
            sourceTechs.has(normalizeTechnology(tech)),
        ),
      };
    }),
  };
  return pruneUnsupportedSummarySentences(synchronized, input);
}

export function relevanceScore(text: string, input: TailorResumeInput): number {
  const normalized = ` ${normalizeText(text)} `;
  return jobTerms(input).reduce(
    (score, term) => score + (normalized.includes(` ${term} `) ? 1 : 0),
    0,
  );
}

export function orderTailoredContentByRelevance(
  output: TailoredResumeDraft,
  input: TailorResumeInput,
): TailoredResumeDraft {
  return {
    ...output,
    tailoredExperiences: output.tailoredExperiences.map((experience) => ({
      ...experience,
      reframedHighlights: [...experience.reframedHighlights].sort(
        (a, b) => relevanceScore(b, input) - relevanceScore(a, input),
      ),
    })),
    tailoredProjects: output.tailoredProjects
      ? [...output.tailoredProjects]
          .map((project) => ({
            ...project,
            reframedHighlights: [...project.reframedHighlights].sort(
              (a, b) => relevanceScore(b, input) - relevanceScore(a, input),
            ),
          }))
          .sort(
            (a, b) =>
              relevanceScore(
                `${b.name} ${b.description} ${b.technologies.join(" ")} ${b.reframedHighlights.join(" ")}`,
                input,
              ) -
              relevanceScore(
                `${a.name} ${a.description} ${a.technologies.join(" ")} ${a.reframedHighlights.join(" ")}`,
                input,
              ),
          )
      : output.tailoredProjects,
  };
}

export function estimateResumeLength(output: TailoredResumeDraft): {
  estimatedLines: number;
  wordCount: number;
} {
  const text = outputText(output);
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const contentLines = [output.reframedSummary]
    .concat(
      output.tailoredExperiences.flatMap(
        (experience) => experience.reframedHighlights,
      ),
      (output.tailoredProjects || []).flatMap(
        (project) => project.reframedHighlights,
      ),
    )
    .reduce(
      (total, value) => total + Math.max(1, Math.ceil(value.length / 105)),
      0,
    );
  const structuralLines =
    10 +
    Math.ceil(output.highlightedSkills.length / 4) +
    output.tailoredExperiences.length * 2 +
    (output.tailoredProjects?.length || 0) * 2;
  return { estimatedLines: structuralLines + contentLines, wordCount };
}

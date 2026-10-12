import type { TailorResumeInput } from "@tailored-cv/types";
import {
  SENIORITY_PATTERN,
  INFORMAL_TITLE_PATTERN,
  EMOJI_PATTERN,
  normalizeText,
  technologyVariants,
  findUnsupportedTechnologies,
  technologyAppearsInText,
  removeTechnologyFromRole,
} from "./core";

export function buildTargetRole(
  input: TailorResumeInput,
  isEnglish = input.targetLanguage === "EN",
): string {
  const withoutAnnotations = input.position
    .replace(EMOJI_PATTERN, " ")
    .replace(/\([^)]*\)|\[[^\]]*\]/g, " ")
    .replace(INFORMAL_TITLE_PATTERN, " ")
    .replace(SENIORITY_PATTERN, " ")
    .replace(
      /^pessoa\s+desenvolvedora\b/i,
      isEnglish ? "Developer" : "Desenvolvedor",
    )
    .replace(
      /^pessoa\s+desenvolvedor\b/i,
      isEnglish ? "Developer" : "Desenvolvedor",
    )
    .replace(/^desenvolvedora\b/i, isEnglish ? "Developer" : "Desenvolvedor")
    .replace(/\bdev\b\.?/gi, isEnglish ? "Developer" : "Desenvolvedor")
    .replace(/\beng\b\.?/gi, isEnglish ? "Engineer" : "Engenheiro")
    .replace(/\s{2,}/g, " ")
    .replace(/\s*[-–—/|]\s*$/g, "")
    .replace(/^\s*[-–—/|]\s*/g, "")
    .trim();
  const supportedTitleTechnologies = input.masterProfile.skills
    .map((skill) => skill.name)
    .filter((technology) =>
      technologyAppearsInText(technology, withoutAnnotations),
    );
  const unsupported = findUnsupportedTechnologies(
    input.masterProfile,
    withoutAnnotations,
  );
  const sourceRole = input.masterProfile.experiences[0]?.position;
  const fallback = isEnglish
    ? sourceRole?.toLowerCase().includes("frontend")
      ? "Frontend Developer"
      : "Software Developer"
    : sourceRole || "Desenvolvedor de Software";
  if (!withoutAnnotations || unsupported.length > 0) return fallback;

  const focus = supportedTitleTechnologies[0]?.replace(/\([^)]*\)/g, "").trim();
  let baseRole = focus
    ? removeTechnologyFromRole(withoutAnnotations, focus)
    : withoutAnnotations;

  if (!isEnglish) {
    if (/\b(?:front[- ]?end)\b/i.test(baseRole)) {
      baseRole = "Desenvolvedor Front-end";
    } else if (/\b(?:back[- ]?end)\b/i.test(baseRole)) {
      baseRole = "Desenvolvedor Back-end";
    } else if (/\b(?:full[- ]?stack)\b/i.test(baseRole)) {
      baseRole = "Desenvolvedor Full Stack";
    }
  } else {
    if (/\b(?:front[- ]?end)\b/i.test(baseRole)) {
      baseRole = "Frontend Developer";
    } else if (/\b(?:back[- ]?end)\b/i.test(baseRole)) {
      baseRole = "Backend Developer";
    } else if (/\b(?:full[- ]?stack)\b/i.test(baseRole)) {
      baseRole = "Full Stack Developer";
    }
  }

  if (!focus) return baseRole;
  return isEnglish
    ? `${baseRole} focused on ${focus}`
    : `${baseRole} com foco em ${focus}`;
}

export function findRelevantProfileSkills(input: TailorResumeInput): string[] {
  const vacancyText = [
    input.position,
    input.jobDescription,
    ...(input.jobAnalysis?.keywords || []),
    ...(input.jobAnalysis?.requiredSkills || []),
    ...(input.jobAnalysis?.desiredSkills || []),
  ].join(" ");
  const compactVacancy = normalizeText(vacancyText).replace(/\s+/g, "");
  const profileSkills = input.masterProfile.skills.map((skill) => skill.name);
  const direct = profileSkills.filter((skill) =>
    technologyVariants(skill).some((variant) =>
      compactVacancy.includes(variant),
    ),
  );
  const implied: string[] = [];
  const normalizedVacancy = normalizeText(vacancyText);
  const addAvailable = (names: string[]) => {
    for (const name of names) {
      const requestedVariants = new Set(technologyVariants(name));
      const found = profileSkills.find((skill) =>
        technologyVariants(skill).some((variant) =>
          requestedVariants.has(variant),
        ),
      );
      if (found) implied.push(found);
    }
  };
  if (
    /\b(frontend|front end|react|next|web|typescript|javascript)\b/.test(
      normalizedVacancy,
    )
  ) {
    addAvailable([
      "React",
      "Next.js",
      "TypeScript",
      "JavaScript",
      "HTML",
      "CSS",
      "SCSS",
      "Tailwind CSS",
      "Zustand",
    ]);
  }

  const hasExplicitBackendScope =
    /\b(perfil\s+full\s*stack|endpoints?\s+(?:em|com)?\s*node|apis?\s+(?:em|com)?\s*node|desenvolvimento\s+backend|desenvolver\s+apis?)\b/.test(
      normalizedVacancy,
    ) ||
    /\b(full\s*stack|backend|back\s*end)\b/.test(normalizeText(input.position));

  if (hasExplicitBackendScope) {
    addAvailable(["Node.js", "NestJS", "Express", "Prisma"]);
    if (
      /\b(postgres|postgresql|banco\s+de\s+dados|database|sql)\b/.test(
        normalizedVacancy,
      )
    ) {
      addAvailable(["PostgreSQL"]);
    }
  }

  if (/\b(testes?|testing|quality|qualidade)\b/.test(normalizedVacancy)) {
    addAvailable(["Vitest", "Testing Library"]);
  }

  if (/\b(ci cd|pipeline|deploy|devops)\b/.test(normalizedVacancy)) {
    addAvailable(["GitHub Actions"]);
    if (/\b(docker|containers?)\b/.test(normalizedVacancy)) {
      addAvailable(["Docker"]);
    }
  }

  if (
    /\b(performance|lighthouse|core web vitals|web vitals|otimizacao)\b/.test(
      normalizedVacancy,
    )
  ) {
    addAvailable(["Core Web Vitals", "Lighthouse"]);
  }
  return Array.from(new Set([...direct, ...implied]));
}

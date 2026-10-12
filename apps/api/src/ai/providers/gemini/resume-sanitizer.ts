import type { TailorResumeInput } from "@tailored-cv/types";
import { buildTargetRole } from "../../resume-quality";

export function replaceLanguageContamination(
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

export function localizeTechnicalTerm(
  value: string,
  isEnglish: boolean,
): string {
  return isEnglish
    ? value.replace(/\bAPIs REST\b/gi, "REST APIs")
    : value.replace(/\bREST APIs\b/gi, "APIs REST");
}

export function sanitizeGeneratedCopy(
  text: string,
  isEnglish: boolean,
): string {
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

export function getHighlightedSkillCap(input: TailorResumeInput): number {
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
    return 16;
  }

  if (signals.size <= 4) return 16;
  if (signals.size <= 10) return 18;
  return 20;
}

export function preserveMasterSummary(
  generatedSummary: string,
  input: TailorResumeInput,
  isEnglish: boolean,
): string {
  const masterSummary = input.masterProfile.summary?.trim();
  if (!masterSummary || isEnglish) return generatedSummary.trim();
  const role = buildTargetRole(input, isEnglish);
  if (!role) return masterSummary;
  return masterSummary.replace(
    /^(?:Desenvolvedor(?:a)?|Engenheiro(?:a)?|Programador(?:a)?)[^.]*?(?=\s+com\b)/i,
    role,
  );
}

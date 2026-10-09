import type { MasterProfileDto } from "@tailored-cv/types";
import { localizeResumeProjectName } from "@tailored-cv/validation";

export function localizeResumeTerm(value: string, isEn: boolean): string {
  if (!value) return value;
  const replacements: Array<[RegExp, string]> = isEn
    ? [
        [/\bAPIs REST\b/gi, "REST APIs"],
        [/\bSessões seguras\b/gi, "Secure sessions"],
        [/\bCookies HttpOnly\b/gi, "HttpOnly cookies"],
        [/\bPortuguês\b/gi, "Portuguese"],
        [/\bInglês\b/gi, "English"],
        [/\bNativo\b/gi, "Native"],
        [/\bIntermediário\b/gi, "Intermediate"],
        [
          /\bComunicação Técnica & Leitura\b/gi,
          "Technical communication & reading",
        ],
      ]
    : [
        [/\bREST APIs\b/gi, "APIs REST"],
        [/\bSecure sessions\b/gi, "Sessões seguras"],
        [/\bHttpOnly cookies\b/gi, "Cookies HttpOnly"],
        [/\bPortuguese\b/gi, "Português"],
        [/\bEnglish\b/gi, "Inglês"],
        [/\bNative\b/gi, "Nativo"],
        [/\bIntermediate\b/gi, "Intermediário"],
        [
          /\bTechnical communication & reading\b/gi,
          "comunicação técnica e leitura",
        ],
      ];
  return replacements.reduce(
    (result, [pattern, replacement]) => result.replace(pattern, replacement),
    value,
  );
}

export { localizeResumeProjectName };

export function formatResumeLanguage(value: string, isEn: boolean): string {
  const normalized = value.trim().toLowerCase();
  const isPortuguese = normalized.startsWith("portugu");
  const isEnglish =
    normalized.startsWith("english") ||
    normalized.startsWith("inglês") ||
    normalized.startsWith("ingles");
  if (isPortuguese) return isEn ? "Portuguese: native" : "Português: nativo";
  if (isEnglish) {
    const intermediate =
      normalized.includes("intermedi") || normalized.includes("technical");
    return isEn
      ? intermediate
        ? "English: intermediate (technical reading and communication)"
        : "English: advanced"
      : intermediate
        ? "Inglês: intermediário (leitura e comunicação técnica)"
        : "Inglês: avançado";
  }
  return localizeResumeTerm(value, isEn)
    .replace(/\s*\([^)]*(native|nativo)[^)]*\)/gi, "")
    .trim();
}

/** Canonical facts come from profile; only translatable prose comes from englishCv. */
export function getResumeProfile(
  profile: MasterProfileDto | null | undefined,
  isEn: boolean,
): MasterProfileDto | null {
  if (!profile) return null;
  const translated = isEn ? profile.englishCv : null;
  if (!translated) return profile;
  const byId = <T extends { id?: string }>(items: T[]) =>
    new Map(items.map((item) => [item.id, item]));
  const experiences = byId(translated.experiences || []);
  const projects = byId(translated.projects || []);
  const educations = byId(translated.educations || []);
  const certifications = byId(translated.certifications || []);
  return {
    ...profile,
    location: translated.location || profile.location,
    summary: translated.summary || profile.summary,
    skills: profile.skills,
    experiences: profile.experiences.map((source, index) => {
      const item = experiences.get(source.id) || translated.experiences[index];
      return {
        ...source,
        position: item?.position || source.position,
        location: item?.location || source.location,
        highlights: item?.highlights || source.highlights,
      };
    }),
    projects: profile.projects.map((source, index) => {
      const item = projects.get(source.id) || translated.projects[index];
      return {
        ...source,
        description: item?.description || source.description,
        highlights: item?.highlights || source.highlights,
      };
    }),
    educations: profile.educations.map((source, index) => {
      const item = educations.get(source.id) || translated.educations[index];
      return {
        ...source,
        degree: item?.degree || source.degree,
        fieldOfStudy: item?.fieldOfStudy || source.fieldOfStudy,
      };
    }),
    certifications: profile.certifications.map((source, index) => {
      const item =
        certifications.get(source.id) || translated.certifications[index];
      return {
        ...source,
        name: item?.name || source.name,
        issuer: item?.issuer || source.issuer,
      };
    }),
  };
}

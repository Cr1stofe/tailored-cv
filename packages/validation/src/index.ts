import { z } from "zod";

export const healthCheckSchema = z.object({
  status: z.enum(["ok", "error"]),
  service: z.string().min(1),
  timestamp: z.string().datetime().optional(),
  database: z.enum(["connected", "disconnected", "unknown"]).optional(),
});

export const skillCategorySchema = z.enum([
  "PROFESSIONAL",
  "HANDS_ON",
  "FAMILIAR",
]);

export const applicationStatusSchema = z.enum([
  "DRAFT",
  "ANALYZED",
  "TAILORED",
]);

export const skillSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Nome da competência é obrigatório").trim(),
  category: skillCategorySchema.default("PROFESSIONAL"),
});

export const experienceSchema = z.object({
  id: z.string().uuid().optional(),
  company: z.string().min(1, "Empresa é obrigatória").trim(),
  position: z.string().min(1, "Cargo é obrigatório").trim(),
  location: z.string().nullable().optional(),
  startDate: z.string().min(1, "Data de início é obrigatória"),
  endDate: z.string().nullable().optional(),
  isCurrent: z.boolean().default(false),
  highlights: z.array(z.string().trim()).default([]),
  technologies: z.array(z.string().trim()).default([]),
  orderIndex: z.number().int().optional(),
});

export const projectSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Nome do projeto é obrigatório").trim(),
  description: z.string().min(1, "Descrição é obrigatória").trim(),
  url: z.string().url("URL inválida").nullable().optional().or(z.literal("")),
  highlights: z.array(z.string().trim()).default([]),
  technologies: z.array(z.string().trim()).default([]),
  orderIndex: z.number().int().optional(),
});

export const educationSchema = z.object({
  id: z.string().uuid().optional(),
  institution: z.string().min(1, "Instituição é obrigatória").trim(),
  degree: z.string().min(1, "Grau ou curso é obrigatório").trim(),
  fieldOfStudy: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
});

export const certificationSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Nome do certificado é obrigatório").trim(),
  issuer: z.string().min(1, "Emissor é obrigatório").trim(),
  issueDate: z.string().nullable().optional(),
  url: z.string().url("URL inválida").nullable().optional().or(z.literal("")),
});

export const masterProfileSchema = z.object({
  id: z.string().uuid().optional(),
  fullName: z.string().min(1, "Nome completo é obrigatório").trim(),
  email: z.string().email("E-mail inválido").trim(),
  phone: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  linkedinUrl: z
    .string()
    .url("URL do LinkedIn inválida")
    .nullable()
    .optional()
    .or(z.literal("")),
  githubUrl: z
    .string()
    .url("URL do GitHub inválida")
    .nullable()
    .optional()
    .or(z.literal("")),
  portfolioUrl: z
    .string()
    .url("URL do Portfolio inválida")
    .nullable()
    .optional()
    .or(z.literal("")),
  summary: z.string().nullable().optional(),
  skills: z.array(skillSchema).default([]),
  experiences: z.array(experienceSchema).default([]),
  projects: z.array(projectSchema).default([]),
  educations: z.array(educationSchema).default([]),
  certifications: z.array(certificationSchema).default([]),
});

export const supportedLanguageSchema = z.enum(["PT", "EN"]);

export const tailorResumeRequestSchema = z.object({
  targetLanguage: supportedLanguageSchema.optional(),
});

export const updateJobApplicationStatusSchema = z.object({
  status: applicationStatusSchema,
});

export const createJobApplicationSchema = z.object({
  company: z.string().min(1, "Nome da empresa é obrigatório").trim(),
  position: z.string().min(1, "Cargo é obrigatório").trim(),
  location: z.string().nullable().optional(),
  url: z
    .string()
    .url("URL da vaga inválida")
    .nullable()
    .optional()
    .or(z.literal("")),
  jobDescription: z
    .string()
    .min(20, "Descrição da vaga deve conter pelo menos 20 caracteres")
    .trim(),
  targetLanguage: supportedLanguageSchema,
});

export const jobAnalysisOutputSchema = z.object({
  summary: z.string().min(1),
  seniorityLevel: z.string().nullable().optional(),
  requiredSkills: z.array(z.string()),
  desiredSkills: z.array(z.string()),
  keyResponsibilities: z.array(z.string()),
  keywords: z.array(z.string()),
  matchScore: z.number().int().min(0).max(100),
  matchingSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
  strategicRecommendations: z.array(z.string()),
});

export const tailoredExperienceItemSchema = z.object({
  experienceId: z.string().optional(),
  company: z.string(),
  position: z.string(),
  period: z.string(),
  location: z.string().optional(),
  reframedHighlights: z.array(z.string()),
  technologies: z.array(z.string()),
});

export const tailoredProjectItemSchema = z.object({
  projectId: z.string().optional(),
  name: z.string(),
  description: z.string(),
  url: z.string().optional(),
  reframedHighlights: z.array(z.string()),
  technologies: z.array(z.string()),
});

export const tailoredResumeFormSchema = z.object({
  resumeId: z.string().uuid().optional(),
  targetedHeadline: z
    .string()
    .min(3, "Headline deve ter no mínimo 3 caracteres")
    .nullable()
    .optional(),
  reframedSummary: z
    .string()
    .min(10, "Resumo profissional deve ter no mínimo 10 caracteres"),
  highlightedSkills: z.array(z.string().trim().min(1)),
  tailoredExperiences: z.array(tailoredExperienceItemSchema),
  tailoredProjects: z.array(tailoredProjectItemSchema).nullable().optional(),
});

export const tailoredResumeOutputSchema = z.object({
  title: z.string().min(1),
  language: supportedLanguageSchema.optional().default("PT"),
  targetedHeadline: z.string().nullable().optional(),
  reframedSummary: z.string().min(1),
  highlightedSkills: z.array(z.string()),
  tailoredExperiences: z.array(tailoredExperienceItemSchema),
  tailoredProjects: z.array(tailoredProjectItemSchema).nullable().optional(),
});

export function sanitizeHeadline(headline?: string | null): string {
  if (!headline) return "";
  return headline
    .replace(
      /\b(senior|sênior|sr\.?|pleno|pl\.?|junior|júnior|jr\.?|mid-level|mid|lead|staff|principal|especialista)\b\s*[-–—/]?\s*/gi,
      "",
    )
    .replace(/\s{2,}/g, " ")
    .replace(/^[-–—|/]\s*/, "")
    .trim();
}

export function formatResumeDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  const trimmed = dateStr
    .trim()
    .replace(/\s*\((conclu[íi]do|concluded|finished|atual|current)\)/gi, "")
    .trim();
  const isoMatch = trimmed.match(
    /(?:^|\D)(\d{4})[-/.](\d{1,2})(?:[-/.]\d{1,2})?(?:$|\D)/,
  );
  if (isoMatch && isoMatch[1] && isoMatch[2]) {
    const year = isoMatch[1];
    const month = isoMatch[2];
    return `${month.padStart(2, "0")}/${year}`;
  }
  return trimmed;
}

export function normalizePeriod(period?: string | null, isEn = false): string {
  if (!period) return "";
  let clean = period
    .trim()
    .replace(/\s*\((conclu[íi]do|concluded|finished|atual|current)\)/gi, "")
    .trim();

  clean = clean.replace(/\b(\d{4})[-/.](\d{1,2})\b/g, (_match, y, m) => {
    return `${m.padStart(2, "0")}/${y}`;
  });

  clean = clean.replace(/\s+(até|ate|to)\s+/gi, " – ");

  clean = clean.replace(/\s+[-–—]\s+/g, " – ");

  if (isEn) {
    clean = clean.replace(/\b(presente|atual)\b/gi, "Present");
  } else {
    clean = clean.replace(/\b(present|current)\b/gi, "Presente");
  }

  return clean;
}

/** Translate generic descriptors while preserving product and proper names. */
export function localizeResumeProjectName(
  name?: string | null,
  isEn = false,
): string {
  if (!name) return "";

  const replacements: Array<[RegExp, string]> = isEn
    ? [
        [
          /\bplataforma de ensino full stack\b/gi,
          "Full Stack E-Learning Platform",
        ],
        [/\bplataforma de ensino\b/gi, "E-Learning Platform"],
        [/\bplataforma educacional\b/gi, "Educational Platform"],
        [/\baplicação web\b/gi, "Web Application"],
      ]
    : [
        [
          /\bfull stack e-learning platform\b/gi,
          "Plataforma de ensino Full Stack",
        ],
        [/\be-learning platform\b/gi, "Plataforma de ensino"],
        [/\beducational platform\b/gi, "Plataforma educacional"],
        [/\bweb application\b/gi, "Aplicação web"],
      ];

  return replacements.reduce(
    (result, [pattern, replacement]) => result.replace(pattern, replacement),
    name.trim(),
  );
}

export type HealthCheck = z.infer<typeof healthCheckSchema>;
export type MasterProfileInput = z.infer<typeof masterProfileSchema>;
export type CreateJobApplicationInput = z.infer<
  typeof createJobApplicationSchema
>;
export type JobAnalysisOutput = z.infer<typeof jobAnalysisOutputSchema>;
export type TailoredResumeOutput = z.infer<typeof tailoredResumeOutputSchema>;
export type TailoredResumeFormInput = z.infer<typeof tailoredResumeFormSchema>;

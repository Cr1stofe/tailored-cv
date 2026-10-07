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
  "APPLIED",
  "INTERVIEWING",
  "REJECTED",
  "OFFER",
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

export const tailoredResumeOutputSchema = z.object({
  title: z.string().min(1),
  targetedHeadline: z.string().nullable().optional(),
  reframedSummary: z.string().min(1),
  highlightedSkills: z.array(z.string()),
  tailoredExperiences: z.array(tailoredExperienceItemSchema),
  tailoredProjects: z.array(tailoredProjectItemSchema).nullable().optional(),
});

export type HealthCheck = z.infer<typeof healthCheckSchema>;
export type MasterProfileInput = z.infer<typeof masterProfileSchema>;
export type CreateJobApplicationInput = z.infer<
  typeof createJobApplicationSchema
>;
export type JobAnalysisOutput = z.infer<typeof jobAnalysisOutputSchema>;
export type TailoredResumeOutput = z.infer<typeof tailoredResumeOutputSchema>;

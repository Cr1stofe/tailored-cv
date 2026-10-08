export interface HealthCheckResponse {
  status: "ok" | "error";
  service: string;
  timestamp?: string;
  database?: "connected" | "disconnected" | "unknown";
}

export type Environment = "development" | "test" | "production";

export type SkillCategory = "PROFESSIONAL" | "HANDS_ON" | "FAMILIAR";

export type ApplicationStatus =
  | "DRAFT"
  | "ANALYZED"
  | "TAILORED"
  | "APPLIED"
  | "INTERVIEWING"
  | "REJECTED"
  | "OFFER";

export interface SkillDto {
  id?: string;
  name: string;
  category: SkillCategory;
}

export interface ExperienceDto {
  id?: string;
  company: string;
  position: string;
  location?: string | null;
  startDate: string;
  endDate?: string | null;
  isCurrent: boolean;
  highlights: string[];
  technologies: string[];
  orderIndex?: number;
}

export interface ProjectDto {
  id?: string;
  name: string;
  description: string;
  url?: string | null;
  highlights: string[];
  technologies: string[];
  orderIndex?: number;
}

export interface EducationDto {
  id?: string;
  institution: string;
  degree: string;
  fieldOfStudy?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface CertificationDto {
  id?: string;
  name: string;
  issuer: string;
  issueDate?: string | null;
  url?: string | null;
}

export type SupportedLanguage = "PT" | "EN";

export interface MasterProfileDto {
  id?: string;
  fullName: string;
  email: string;
  phone?: string | null;
  location?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
  summary?: string | null;
  skills: SkillDto[];
  experiences: ExperienceDto[];
  projects: ProjectDto[];
  educations: EducationDto[];
  certifications: CertificationDto[];
  englishCv?: MasterProfileDto | null;
  englishCvUpdatedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface JobAnalysisDto {
  id?: string;
  applicationId: string;
  summary: string;
  seniorityLevel?: string | null;
  requiredSkills: string[];
  desiredSkills: string[];
  keyResponsibilities: string[];
  keywords: string[];
  matchScore: number;
  matchingSkills: string[];
  missingSkills: string[];
  strategicRecommendations: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface TailoredExperienceItem {
  experienceId?: string;
  company: string;
  position: string;
  period: string;
  location?: string;
  reframedHighlights: string[];
  technologies: string[];
}

export interface TailoredProjectItem {
  projectId?: string;
  name: string;
  description: string;
  url?: string;
  reframedHighlights: string[];
  technologies: string[];
}

export interface TailoredResumeDto {
  id?: string;
  applicationId: string;
  version: number;
  title: string;
  language: SupportedLanguage;
  targetedHeadline?: string | null;
  reframedSummary: string;
  highlightedSkills: string[];
  tailoredExperiences: TailoredExperienceItem[];
  tailoredProjects?: TailoredProjectItem[] | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface JobApplicationDto {
  id: string;
  profileId: string;
  company: string;
  position: string;
  location?: string | null;
  url?: string | null;
  jobDescription: string;
  targetLanguage: SupportedLanguage;
  status: ApplicationStatus;
  jobAnalysis?: JobAnalysisDto | null;
  tailoredResumes?: TailoredResumeDto[];
  createdAt: string;
  updatedAt: string;
}

export interface JobAnalysisInput {
  jobDescription: string;
  company: string;
  position: string;
  masterProfile: MasterProfileDto;
  targetLanguage?: SupportedLanguage;
}

export interface TailorResumeInput {
  jobDescription: string;
  company: string;
  position: string;
  masterProfile: MasterProfileDto;
  jobAnalysis?: JobAnalysisDto;
  targetLanguage?: SupportedLanguage;
}

export interface AIHealthStatus {
  status: "connected" | "error";
  provider: string;
  tokensConsumed: number;
  latencyMs: number;
  message?: string;
  availableModels?: string[];
}

export interface AIProvider {
  analyzeJob(
    input: JobAnalysisInput,
  ): Promise<
    Omit<JobAnalysisDto, "id" | "applicationId" | "createdAt" | "updatedAt">
  >;
  tailorResume(
    input: TailorResumeInput,
  ): Promise<
    Omit<
      TailoredResumeDto,
      "id" | "applicationId" | "version" | "createdAt" | "updatedAt"
    >
  >;
  translateProfileToEnglish(
    profile: MasterProfileDto,
  ): Promise<MasterProfileDto>;
  checkHealth?(): Promise<AIHealthStatus>;
}


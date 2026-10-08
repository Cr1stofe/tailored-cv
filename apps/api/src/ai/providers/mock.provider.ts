import { Logger } from "@nestjs/common";
import type {
  AIHealthStatus,
  MasterProfileDto,
  ExperienceDto,
  ProjectDto,
  EducationDto,
} from "@tailored-cv/types";
import {
  AIProvider,
  JobAnalysisInput,
  TailorResumeInput,
  JobAnalysisOutput,
  TailoredResumeOutput,
} from "../ai.constants";

export class MockProvider implements AIProvider {
  private readonly logger = new Logger(MockProvider.name);

  async checkHealth(): Promise<AIHealthStatus> {
    return {
      status: "connected",
      provider: "mock",
      tokensConsumed: 0,
      latencyMs: 1,
      availableModels: ["mock-model"],
    };
  }

  async analyzeJob(input: JobAnalysisInput): Promise<JobAnalysisOutput> {
    this.logger.log(
      `Executing Mock Job Analysis for ${input.position} at ${input.company}`,
    );

    const candidateSkills = input.masterProfile.skills.map((s) => s.name);
    const candidateSkillsLower = candidateSkills.map((s) => s.toLowerCase());

    const descriptionLower = input.jobDescription.toLowerCase();
    const matchingSkills = candidateSkills.filter((skill) =>
      descriptionLower.includes(skill.toLowerCase()),
    );

    const missingSkills = ["Kubernetes", "GraphQL", "AWS Lambda"].filter(
      (skill) =>
        descriptionLower.includes(skill.toLowerCase()) &&
        !candidateSkillsLower.includes(skill.toLowerCase()),
    );

    const matchScore = Math.min(
      95,
      Math.max(
        50,
        Math.round(
          (matchingSkills.length / Math.max(candidateSkills.length, 1)) * 100,
        ) + 30,
      ),
    );

    return {
      summary: `Oportunidade para ${input.position} na empresa ${input.company}, com foco em desenvolvimento de ponta a ponta e práticas modernas de engenharia.`,
      seniorityLevel: "Pleno / Sênior",
      requiredSkills: matchingSkills.slice(0, 5),
      desiredSkills: missingSkills,
      keyResponsibilities: [
        `Desenvolvimento e sustentação de serviços para ${input.position}`,
        "Colaboração com equipes de produto e design para entrega contínua",
        "Garantia de qualidade de código, boas práticas e cobertura de testes",
      ],
      keywords: Array.from(
        new Set([...matchingSkills, input.position, "Clean Architecture"]),
      ),
      matchScore,
      matchingSkills,
      missingSkills,
      strategicRecommendations: [
        "Enfatizar resultados práticos e arquitetura limpa nos primeiros bullets de cada experiência.",
        "Manter integridade estrita sem mencionar ferramentas não utilizadas no dia a dia.",
      ],
    };
  }

  async tailorResume(input: TailorResumeInput): Promise<TailoredResumeOutput> {
    this.logger.log(
      `Executing Mock Resume Tailoring for ${input.position} at ${input.company}`,
    );

    const candidateSkills = input.masterProfile.skills.map((s) => s.name);
    const descLower = (input.jobDescription || "").toLowerCase();

    const relevantProjects = [...input.masterProfile.projects]
      .sort((a, b) => {
        const aMatches = a.technologies.filter((t) =>
          descLower.includes(t.toLowerCase()),
        ).length;
        const bMatches = b.technologies.filter((t) =>
          descLower.includes(t.toLowerCase()),
        ).length;
        return bMatches - aMatches;
      })
      .slice(0, 3);

    return {
      title: `Currículo Adaptado — ${input.position} (${input.company})`,
      language: input.targetLanguage || "PT",
      targetedHeadline: `${input.position} | React · Next.js · TypeScript · Node.js · NestJS`,
      reframedSummary:
        input.masterProfile.summary ||
        `Desenvolvedor Full Stack com sólida experiência na entrega de soluções escaláveis em produção, com forte domínio em TypeScript, ecossistema React/Next.js e arquiteturas de backend com Node.js e PostgreSQL. Foco em alta performance, código limpo e impacto mensurável para a ${input.company}.`,
      highlightedSkills: candidateSkills
        .filter((s) => descLower.includes(s.toLowerCase()))
        .concat(candidateSkills)
        .slice(0, 8),
      tailoredExperiences: input.masterProfile.experiences.map((exp) => ({
        experienceId: exp.id,
        company: exp.company,
        position: exp.position,
        period: `${exp.startDate} – ${exp.endDate || (exp.isCurrent ? "Presente" : "")}`,
        location: exp.location || "Remoto",
        reframedHighlights: exp.highlights,
        technologies: exp.technologies,
      })),
      tailoredProjects: relevantProjects.map((proj) => ({
        projectId: proj.id,
        name: proj.name,
        description: proj.description,
        url: proj.url || undefined,
        reframedHighlights: proj.highlights,
        technologies: proj.technologies,
      })),
    };
  }

  async translateProfileToEnglish(
    profile: MasterProfileDto,
  ): Promise<MasterProfileDto> {
    this.logger.log(
      `Executing Mock Profile Translation to English for ${profile.fullName}`,
    );

    return {
      ...profile,
      summary: profile.summary
        ? "Senior Full Stack Engineer with strong expertise in building scalable, production-grade systems across React, Next.js, Node.js, and cloud infrastructure. Focused on high performance and clean architecture."
        : null,
      experiences: (profile.experiences || []).map((e: ExperienceDto) => ({
        ...e,
        position: e.position
          .replace(/Desenvolvedor/gi, "Developer")
          .replace(/Pleno/gi, "Mid-level")
          .replace(/Sênior/gi, "Senior"),
        highlights: (e.highlights || []).map(
          (h: string) => `Engineered and delivered: ${h}`,
        ),
      })),
      projects: (profile.projects || []).map((p: ProjectDto) => ({
        ...p,
        description: `High-performance application: ${p.description}`,
        highlights: (p.highlights || []).map(
          (h: string) => `Implemented: ${h}`,
        ),
      })),
      educations: (profile.educations || []).map((ed: EducationDto) => ({
        ...ed,
        degree: ed.degree.replace(/Bacharelado/gi, "Bachelor's Degree"),
      })),
    };
  }
}



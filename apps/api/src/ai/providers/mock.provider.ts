import { Logger } from "@nestjs/common";
import type {
  AIHealthStatus,
  CoverLetterInput,
  CoverLetterOutput,
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
  TailoredResumeDraft,
  TailoredResumeOutput,
  formatResumeDate,
} from "../ai.constants";
import {
  buildTargetRole,
  evaluateJobCompatibility,
  findRelevantProfileSkills,
  orderTailoredContentByRelevance,
  relevanceScore,
  synchronizeTailoredResume,
  validateTailoredResume,
  withGenerationReport,
} from "../resume-quality";

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

    return evaluateJobCompatibility(input, {
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
      matchingSkills,
      missingSkills,
      strategicRecommendations: [
        "Enfatizar resultados práticos e arquitetura limpa nos primeiros bullets de cada experiência.",
        "Manter integridade estrita sem mencionar ferramentas não utilizadas no dia a dia.",
      ],
    });
  }

  async tailorResume(input: TailorResumeInput): Promise<TailoredResumeOutput> {
    this.logger.log(
      `Executing Mock Resume Tailoring for ${input.position} at ${input.company}`,
    );

    const isEnglish = input.targetLanguage === "EN";
    const candidateSkills = input.masterProfile.skills.map((s) => s.name);

    const selectedExperienceBullets = input.masterProfile.experiences.flatMap(
      (experience) =>
        [...experience.highlights]
          .sort((a, b) => relevanceScore(b, input) - relevanceScore(a, input))
          .slice(0, 4),
    );
    let relevantProjects = [...input.masterProfile.projects]
      .filter(
        (project) =>
          !selectedExperienceBullets.some((bullet) =>
            bullet.toLowerCase().includes(project.name.toLowerCase()),
          ),
      )
      .sort((a, b) => {
        return (
          relevanceScore(
            `${b.name} ${b.description} ${b.technologies.join(" ")} ${b.highlights.join(" ")}`,
            input,
          ) -
          relevanceScore(
            `${a.name} ${a.description} ${a.technologies.join(" ")} ${a.highlights.join(" ")}`,
            input,
          )
        );
      })
      .slice(0, 2);

    if (relevantProjects.length === 0) {
      relevantProjects = input.masterProfile.projects.slice(0, 2);
    }

    const cleanRole = buildTargetRole(input, isEnglish);
    const matchedSkills = findRelevantProfileSkills(input);
    const draft: TailoredResumeDraft = {
      title: isEnglish
        ? `Tailored Resume — ${input.company}`
        : `Currículo Adaptado — ${input.company}`,
      language: input.targetLanguage || "PT",
      targetedHeadline: cleanRole,
      reframedSummary: isEnglish
        ? "Results-driven Software Engineer with extensive experience delivering robust, high-performance web and mobile applications in production. Specialized in TypeScript, the React/Next.js ecosystem, and scalable Node.js architectures."
        : input.masterProfile.summary ||
          `Desenvolvedor Full Stack com sólida experiência na entrega de soluções escaláveis em produção, com forte domínio em TypeScript, ecossistema React/Next.js e arquiteturas de backend com Node.js e PostgreSQL. Foco em alta performance, código limpo e impacto mensurável para a ${input.company}.`,
      highlightedSkills: Array.from(
        new Set([...matchedSkills, ...candidateSkills]),
      ).slice(0, 16),
      tailoredExperiences: input.masterProfile.experiences.map((exp) => ({
        experienceId: exp.id,
        company: exp.company,
        position: isEnglish
          ? exp.position
              .replace(/Desenvolvedor/gi, "Developer")
              .replace(/Pleno/gi, "Mid-level")
              .replace(/Sênior/gi, "Senior")
          : exp.position,
        period: `${formatResumeDate(exp.startDate)} – ${exp.endDate ? formatResumeDate(exp.endDate) : exp.isCurrent ? (isEnglish ? "Present" : "Presente") : ""}`,
        location: isEnglish
          ? exp.location?.toLowerCase().includes("remoto")
            ? "Remote"
            : exp.location || "Remote"
          : exp.location || "Remoto",
        reframedHighlights: [...exp.highlights]
          .sort((a, b) => relevanceScore(b, input) - relevanceScore(a, input))
          .slice(0, 4),
        technologies: exp.technologies,
      })),
      tailoredProjects: relevantProjects.map((proj) => ({
        projectId: proj.id,
        name: isEnglish
          ? proj.name.replace(/Plataforma de ensino/gi, "E-Learning Platform")
          : proj.name,
        description: proj.description,
        url: proj.url || undefined,
        reframedHighlights: proj.highlights,
        technologies: proj.technologies,
      })),
    };
    const ordered = orderTailoredContentByRelevance(
      synchronizeTailoredResume(draft, input),
      input,
    );
    const quality = validateTailoredResume(input, ordered);
    return withGenerationReport(input, ordered, quality);
  }

  async generateCoverLetter(
    input: CoverLetterInput,
  ): Promise<CoverLetterOutput> {
    const isEnglish = input.targetLanguage === "EN";
    const summary =
      input.tailoredResume?.reframedSummary || input.masterProfile.summary;
    const skills = (
      input.tailoredResume?.highlightedSkills ||
      input.masterProfile.skills.map((skill) => skill.name)
    )
      .slice(0, 5)
      .join(", ");

    return {
      content: isEnglish
        ? [
            "Dear Hiring Manager,",
            `I am writing to apply for the ${input.position} role at ${input.company}. My experience in ${input.focus === "frontend" ? "front-end" : "full-stack"} development has prepared me to contribute with practical, production-focused solutions.`,
            summary ||
              "My background combines hands-on technical experience with a practical and collaborative approach to software delivery.",
            skills
              ? `My relevant experience includes ${skills}.`
              : "My professional background aligns well with the needs of this role.",
            "I would welcome the opportunity to discuss how I can contribute to your team.",
            "Sincerely,",
            input.masterProfile.fullName,
          ].join("\n\n")
        : [
            "Prezado time de recrutamento,",
            `Gostaria de me candidatar à vaga de ${input.position} em ${input.company}. Minha experiência em ${input.focus === "frontend" ? "desenvolvimento front-end" : "desenvolvimento full-stack"} me preparou para contribuir com soluções práticas e orientadas à produção.`,
            summary ||
              "Meu perfil combina experiência técnica prática com uma abordagem colaborativa e orientada à entrega de soluções confiáveis.",
            skills
              ? `Minha experiência relevante inclui ${skills}.`
              : "Minha experiência profissional está alinhada às necessidades desta oportunidade.",
            "Gostaria de ter a oportunidade de conversar sobre como posso contribuir com a equipe.",
            "Atenciosamente,",
            input.masterProfile.fullName,
          ].join("\n\n"),
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
      location: profile.location
        ? profile.location.includes("Brazil")
          ? profile.location
          : `${profile.location}, Brazil`
        : profile.location,
      summary: profile.summary
        ? "Full Stack Engineer with strong expertise in building scalable, production-grade systems across React, Next.js, Node.js, and cloud infrastructure. Focused on high performance and clean architecture."
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

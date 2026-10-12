import { describe, expect, it } from "vitest";
import type { TailoredResumeDraft } from "@tailored-cv/validation";
import {
  angularFrontendFixture,
  luminaFrontendFixture,
  orbitaCommerceFixture,
} from "./fixtures/tailoring.test-fixtures";
import {
  buildTargetRole,
  buildTailoringReport,
  evaluateJobCompatibility,
  findRelevantProfileSkills,
  orderTailoredContentByRelevance,
  synchronizeTailoredResume,
  validateTailoredResume,
} from "./resume-quality";

function validLuminaDraft(): TailoredResumeDraft {
  const profile = luminaFrontendFixture.masterProfile;
  const experience = profile.experiences[0]!;
  const portfolio = profile.projects.find(
    (project) => project.id === "project-portfolio",
  )!;
  const veltro = profile.projects.find(
    (project) => project.id === "project-veltro",
  )!;
  return synchronizeTailoredResume(
    {
      title: "Currículo Adaptado — Desenvolvedor Front-end Pleno",
      language: "PT",
      targetedHeadline:
        "Desenvolvedor Front-end | React · TypeScript · Next.js",
      reframedSummary: profile.summary!,
      highlightedSkills: [
        "React",
        "TypeScript",
        "Next.js (SSR, SSG, ISR)",
        "GitHub Actions (CI)",
        "Vitest",
        "Testing Library",
        "JavaScript",
        "Zustand",
        "HTML",
        "CSS",
        "Git",
        "Zod",
      ],
      tailoredExperiences: [
        {
          experienceId: experience.id,
          company: experience.company,
          position: experience.position,
          location: experience.location || undefined,
          period: "07/2023 – Presente",
          reframedHighlights: [
            experience.highlights[0]!,
            experience.highlights[2]!,
            experience.highlights[3]!,
            experience.highlights[1]!,
          ],
          technologies: experience.technologies,
        },
      ],
      tailoredProjects: [portfolio, veltro].map((project) => ({
        projectId: project.id,
        name: project.name,
        description: project.description,
        url: project.url || undefined,
        reframedHighlights: project.highlights,
        technologies: project.technologies,
      })),
    },
    luminaFrontendFixture,
  );
}

describe("deterministic tailored resume quality", () => {
  it("accepts a grounded, relevant and one-page Lumina resume", () => {
    const draft = orderTailoredContentByRelevance(
      validLuminaDraft(),
      luminaFrontendFixture,
    );
    const result = validateTailoredResume(luminaFrontendFixture, draft);

    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
    expect(result.estimatedLines).toBeLessThanOrEqual(62);
  });

  it("rejects a technology that does not exist in the master", () => {
    const draft = validLuminaDraft();
    draft.highlightedSkills.unshift("Cypress");

    const result = validateTailoredResume(luminaFrontendFixture, draft);

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "UNSUPPORTED_TECHNOLOGY" }),
      ]),
    );
  });

  it("rejects a number that does not exist in the master", () => {
    const draft = validLuminaDraft();
    draft.tailoredExperiences[0]!.reframedHighlights[0] +=
      " Resultado adicional de 42%.";

    const result = validateTailoredResume(luminaFrontendFixture, draft);

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "UNSUPPORTED_NUMBER" }),
      ]),
    );
  });

  it.each([
    "more than 100 thousand downloads",
    "over 100+ thousand downloads",
    "more than 100K+ downloads",
  ])("accepts an English equivalent of the PT metric: %s", (metric) => {
    const draft = validLuminaDraft();
    draft.language = "EN";
    draft.tailoredExperiences[0]!.reframedHighlights = [
      `Motul Expert: Flutter app with ${metric}. Participated in restructuring the solution with a focus on stability and performance.`,
    ];

    const result = validateTailoredResume(
      { ...luminaFrontendFixture, targetLanguage: "EN" },
      draft,
    );

    expect(result.errors.map(({ code }) => code)).not.toContain(
      "UNSUPPORTED_NUMBER",
    );
  });

  it("accepts REST APIs as the English equivalent of APIs REST", () => {
    const draft = validLuminaDraft();
    draft.language = "EN";
    draft.highlightedSkills = draft.highlightedSkills
      .filter((skill) => skill !== "APIs REST")
      .concat("REST APIs");

    const result = validateTailoredResume(
      { ...luminaFrontendFixture, targetLanguage: "EN" },
      draft,
    );

    expect(result.errors.map(({ code }) => code)).not.toContain(
      "UNSUPPORTED_TECHNOLOGY",
    );
  });

  it.each(["Next. js", "Integreei com APIs REST"])(
    "rejects invalid spelling: %s",
    (invalidText) => {
      const draft = validLuminaDraft();
      draft.tailoredExperiences[0]!.reframedHighlights[0] = invalidText;

      const result = validateTailoredResume(luminaFrontendFixture, draft);

      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: "INVALID_SPELLING" }),
        ]),
      );
    },
  );

  it("rejects authorship inflation from Participei to Reestruturei", () => {
    const draft = validLuminaDraft();
    draft.tailoredExperiences[0]!.reframedHighlights[3] =
      "Reestruturei a solução Motul Expert com foco em estabilidade e performance.";

    const result = validateTailoredResume(luminaFrontendFixture, draft);

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "RESPONSIBILITY_INFLATION" }),
      ]),
    );
  });

  it("orders React and Next.js evidence before Flutter for a React role", () => {
    const draft = validLuminaDraft();
    const experience = draft.tailoredExperiences[0]!;
    experience.reframedHighlights = [
      experience.reframedHighlights[3]!,
      experience.reframedHighlights[0]!,
      experience.reframedHighlights[1]!,
    ];

    const ordered = orderTailoredContentByRelevance(
      draft,
      luminaFrontendFixture,
    );

    expect(ordered.tailoredExperiences[0]!.reframedHighlights[0]).not.toContain(
      "Motul Expert",
    );
    expect(ordered.tailoredExperiences[0]!.reframedHighlights.at(-1)).toContain(
      "Motul Expert",
    );
  });

  it("rejects duplicated measurable results across experience and projects", () => {
    const draft = validLuminaDraft();
    const ranking = luminaFrontendFixture.masterProfile.projects.find(
      (project) => project.id === "project-ranking",
    )!;
    draft.tailoredProjects = [
      {
        projectId: ranking.id,
        name: ranking.name,
        description: ranking.description,
        reframedHighlights: [
          "Ranking dos Políticos: frontend de plataforma que avalia o desempenho de parlamentares brasileiros, em Next.js, React e TypeScript. Aprovada em todos os Core Web Vitals nos dados reais do Google, com LCP de 1,4 s e nota 99 no Lighthouse.",
        ],
        technologies: ranking.technologies,
      },
    ];

    const result = validateTailoredResume(luminaFrontendFixture, draft);

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "DUPLICATED_RESULT" }),
      ]),
    );
  });

  it("reports a translated duplicate as a warning instead of blocking EN generation", () => {
    const draft = validLuminaDraft();
    const duplicate =
      "Development of scalable web applications with React and Next.js (SSR, SSG, ISR), reusable components, and Zustand for state management.";
    draft.language = "EN";
    draft.tailoredExperiences[0]!.reframedHighlights = [duplicate];
    draft.tailoredProjects = [
      {
        projectId: "project-portfolio",
        name: "Personal Portfolio",
        description: "Personal website",
        reframedHighlights: [duplicate],
        technologies: ["React", "Next.js", "TypeScript"],
      },
    ];

    const result = validateTailoredResume(
      { ...luminaFrontendFixture, targetLanguage: "EN" },
      draft,
    );

    expect(result.errors.map(({ code }) => code)).not.toContain(
      "DUPLICATED_RESULT",
    );
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining("Resultado duplicado")]),
    );
  });

  it("rejects removal of numbers and facts from the master summary", () => {
    const draft = validLuminaDraft();
    draft.reframedSummary =
      "Desenvolvedor Front-end com experiência em React e TypeScript.";

    const result = validateTailoredResume(luminaFrontendFixture, draft);

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "SUMMARY_FACT_REMOVED" }),
      ]),
    );
  });

  it("rejects content estimated to exceed one page", () => {
    const draft = validLuminaDraft();
    const sourceBullet =
      luminaFrontendFixture.masterProfile.experiences[0]!.highlights[0]!;
    draft.tailoredExperiences[0]!.reframedHighlights = Array.from(
      { length: 40 },
      () => sourceBullet,
    );

    const result = validateTailoredResume(luminaFrontendFixture, draft);

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "PAGE_LENGTH" }),
      ]),
    );
  });

  it("reports uncovered requirements and scores only mandatory coverage", () => {
    const draft = validLuminaDraft();
    const report = buildTailoringReport(luminaFrontendFixture, draft, []);

    expect(report.uncovered_requirements).toContain("Obrigatório: Cypress");
    expect(report.match_score).toBe(75);
    expect(report.match_explanation).toContain("3 de 4");
    expect(
      report.highlighted.some(({ item }) => item === "Portfólio Pessoal"),
    ).toBe(true);
  });

  it("does not claim coverage for a different Angular stack", () => {
    const draft = validLuminaDraft();
    const report = buildTailoringReport(angularFrontendFixture, draft, []);

    expect(report.match_score).toBe(0);
    expect(report.uncovered_requirements).toEqual(
      expect.arrayContaining([
        "Obrigatório: Angular",
        "Obrigatório: RxJS",
        "Obrigatório: NgRx",
        "Obrigatório: Jasmine",
        "Obrigatório: Azure",
      ]),
    );
  });

  describe("Orbita Commerce regressions", () => {
    const orbitaDraft = () =>
      orderTailoredContentByRelevance(
        synchronizeTailoredResume(validLuminaDraft(), orbitaCommerceFixture),
        orbitaCommerceFixture,
      );

    it("1. rejects empty parentheses or brackets", () => {
      const draft = orbitaDraft();
      draft.reframedSummary = draft.reframedSummary.replace(
        " com mais",
        " () com mais",
      );

      const result = validateTailoredResume(orbitaCommerceFixture, draft);

      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: "EMPTY_DELIMITERS" }),
        ]),
      );
    });

    it("2. creates one coherent functional title without copied seniority", () => {
      const draft = orbitaDraft();

      expect(buildTargetRole(orbitaCommerceFixture)).toBe(
        "Desenvolvedor Front-end com foco em Next.js",
      );
      expect(draft.targetedHeadline).toBe(
        "Desenvolvedor Front-end com foco em Next.js",
      );
      expect(draft.reframedSummary).toMatch(
        /^Desenvolvedor Front-end com foco em Next\.js com mais de 3 anos/,
      );
      expect(
        synchronizeTailoredResume(draft, orbitaCommerceFixture).reframedSummary,
      ).not.toContain("com foco em Next.js com foco em Next.js");

      draft.targetedHeadline = `${draft.targetedHeadline} Pleno`;
      const result = validateTailoredResume(orbitaCommerceFixture, draft);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: "UNSUPPORTED_SENIORITY" }),
        ]),
      );
    });

    it("3. rejects a summary product that was removed from the body", () => {
      const draft = orbitaDraft();
      draft.tailoredExperiences[0]!.reframedHighlights =
        draft.tailoredExperiences[0]!.reframedHighlights.filter(
          (bullet) => !bullet.includes("Motul Expert"),
        );
      draft.highlightedSkills = draft.highlightedSkills.filter(
        (skill) => skill !== "Flutter",
      );

      const result = validateTailoredResume(orbitaCommerceFixture, draft);

      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: "SUMMARY_BODY_MISMATCH" }),
        ]),
      );
    });

    it("4. rejects technologies not supported by a bullet in their section", () => {
      const draft = orbitaDraft();
      draft.tailoredExperiences[0]!.technologies.push("WordPress");

      const result = validateTailoredResume(orbitaCommerceFixture, draft);

      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "UNSUPPORTED_SECTION_TECHNOLOGY",
          }),
        ]),
      );
    });

    it("5. prioritizes proven backend skills implied by endpoints and full stack", () => {
      const skills = findRelevantProfileSkills(orbitaCommerceFixture);

      expect(skills).toEqual(
        expect.arrayContaining([
          "Node.js",
          "NestJS",
          "Express",
          "Prisma",
          "PostgreSQL",
        ]),
      );
      expect(orbitaDraft().highlightedSkills).toEqual(
        expect.arrayContaining(["NestJS", "Express", "Prisma"]),
      );
    });

    it("6. rejects a retained product whose master link was dropped", () => {
      const draft = orbitaDraft();
      const rankingBulletIndex =
        draft.tailoredExperiences[0]!.reframedHighlights.findIndex((bullet) =>
          bullet.includes("Ranking dos Políticos"),
        );
      draft.tailoredExperiences[0]!.reframedHighlights[rankingBulletIndex] =
        draft.tailoredExperiences[0]!.reframedHighlights[
          rankingBulletIndex
        ]!.replace(" (https://politicos.org.br/)", "");

      const result = validateTailoredResume(orbitaCommerceFixture, draft);

      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: "MISSING_PROJECT_LINK" }),
        ]),
      );
    });

    it("7. retains the strong Motul result faithfully when it fits", () => {
      const draftWithoutMotul = validLuminaDraft();
      draftWithoutMotul.tailoredExperiences[0]!.reframedHighlights =
        draftWithoutMotul.tailoredExperiences[0]!.reframedHighlights.filter(
          (bullet) => !bullet.includes("Motul Expert"),
        );

      const synchronized = synchronizeTailoredResume(
        draftWithoutMotul,
        orbitaCommerceFixture,
      );
      const motulBullet =
        synchronized.tailoredExperiences[0]!.reframedHighlights.find((bullet) =>
          bullet.includes("Motul Expert"),
        );

      expect(motulBullet).toContain("mais de 100 mil downloads");
      expect(motulBullet).toContain("Participei da reestruturação");
      expect(
        synchronized.tailoredExperiences[0]!.reframedHighlights,
      ).toHaveLength(4);
    });

    it("repairs the summary when the large Veltro project is omitted", () => {
      const input = structuredClone(orbitaCommerceFixture);
      input.masterProfile.summary = `${input.masterProfile.summary} Opero a plataforma com RBAC, sessões seguras, streaming de mídia em servidor Linux na Oracle Cloud (OCI).`;
      input.masterProfile.skills.push(
        { name: "Linux", category: "PROFESSIONAL" },
        { name: "Oracle Cloud (OCI)", category: "HANDS_ON" },
        { name: "RBAC", category: "HANDS_ON" },
        { name: "Sessões seguras", category: "HANDS_ON" },
        { name: "Streaming de mídia (HTTP 206)", category: "HANDS_ON" },
      );
      const draft = orbitaDraft();
      draft.reframedSummary = input.masterProfile.summary.replace(
        "Desenvolvedor Full Stack",
        "Desenvolvedor Front-end com foco em Next.js",
      );
      draft.tailoredProjects = draft.tailoredProjects?.filter(
        (project) => project.projectId !== "project-veltro",
      );

      const repaired = synchronizeTailoredResume(draft, input);
      const result = validateTailoredResume(input, repaired);

      expect(repaired.reframedSummary).not.toContain("Oracle Cloud");
      expect(result.errors.map(({ code }) => code)).not.toContain(
        "SUMMARY_BODY_MISMATCH",
      );
      expect(result.errors.map(({ code }) => code)).not.toContain(
        "RELEVANT_PROJECT_OMITTED",
      );
      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.stringContaining("Projeto relevante omitido"),
        ]),
      );
    });
  });

  describe("job title improvements", () => {
    it("normalizes informal buzzwords, emojis and contract notes to professional roles", () => {
      const input = {
        ...luminaFrontendFixture,
        position: "Dev Full Stack Ninja 🚀 (CLT/PJ)",
      };
      expect(buildTargetRole(input)).toBe("Desenvolvedor Full Stack");

      const inputFront = {
        ...luminaFrontendFixture,
        position: "Dev Front-end Rockstar 💻 [Remoto]",
      };
      expect(buildTargetRole(inputFront)).toBe("Desenvolvedor Front-end");

      const inputEn = {
        ...luminaFrontendFixture,
        position: "Full Stack Developer Guru 🧙",
        targetLanguage: "EN" as const,
      };
      expect(buildTargetRole(inputEn, true)).toBe("Full Stack Developer");
    });
  });

  describe("project deduplication", () => {
    it("replaces a duplicate project with another strong master project when metrics repeat", () => {
      const draft = validLuminaDraft();
      const ranking = luminaFrontendFixture.masterProfile.projects.find(
        (p) => p.id === "project-ranking",
      )!;
      draft.tailoredProjects = [
        {
          projectId: ranking.id,
          name: ranking.name,
          description: ranking.description,
          url: ranking.url || undefined,
          reframedHighlights: [
            "Aprovada em todos os Core Web Vitals do Google em produção, atingindo LCP de 1,4 s e nota 99 no Lighthouse.",
          ],
          technologies: ranking.technologies,
        },
      ];

      const synchronized = synchronizeTailoredResume(
        draft,
        luminaFrontendFixture,
      );
      const projectNames = (synchronized.tailoredProjects || []).map(
        (p) => p.name,
      );
      expect(projectNames).not.toContain("Ranking dos Políticos");
      expect(
        projectNames.some(
          (name) => name.includes("Veltro") || name.includes("Portfólio"),
        ),
      ).toBe(true);
    });
  });

  describe("project description technologies", () => {
    it("does not reject technologies evidenced in project description or master", () => {
      const draft = validLuminaDraft();
      const veltroProject = draft.tailoredProjects!.find(
        (p) => p.projectId === "project-veltro",
      )!;
      veltroProject.technologies = [
        "Next.js",
        "NestJS",
        "PostgreSQL",
        "Prisma",
        "Docker",
      ];
      veltroProject.reframedHighlights = [
        "Frontend em Next.js com gerenciamento de estado.",
        "API modular em NestJS com PostgreSQL e Prisma.",
      ];

      const result = validateTailoredResume(luminaFrontendFixture, draft);
      const sectionTechErrors = result.errors.filter(
        (e) =>
          e.code === "UNSUPPORTED_SECTION_TECHNOLOGY" &&
          e.message.includes(veltroProject.name),
      );
      expect(sectionTechErrors).toEqual([]);
    });
  });

  describe("evaluateJobCompatibility", () => {
    it("computes match score strictly from required skills, detects partial coverage and objective recommendation", () => {
      const result = evaluateJobCompatibility(
        {
          company: "Tech Solutions",
          position: "Desenvolvedor Frontend",
          jobDescription: "Vaga remota para Desenvolvedor Frontend.",
          masterProfile: luminaFrontendFixture.masterProfile,
        },
        {
          summary: "Vaga Frontend com foco em arquitetura SPA e estado.",
          seniorityLevel: "Pleno",
          requiredSkills: ["React", "TypeScript", "Next.js", "NgRx"],
          desiredSkills: ["Docker", "Kubernetes"],
          strategicRecommendations: [],
        },
      );

      expect(result.matchScore).toBe(75);
      expect(result.matchingSkills).not.toContain("NgRx");
      expect(result.missingSkills).toContain("NgRx");

      const partialRec = result.strategicRecommendations.find((r) =>
        r.includes("Coberturas parciais"),
      );
      expect(partialRec).toBeDefined();
      expect(partialRec).toContain("NgRx");
      expect(partialRec).toContain("Zustand");

      expect(result.strategicRecommendations[0]).toContain(
        "Recomendação: Aplicar com ressalvas",
      );
    });

    it("identifies critical incompatibility for onsite role in different location", () => {
      const result = evaluateJobCompatibility(
        {
          company: "Presencial Corp",
          position: "Desenvolvedor Frontend Presencial",
          jobDescription:
            "Vaga 100% presencial em Curitiba para atuar no escritório da empresa.",
          masterProfile: luminaFrontendFixture.masterProfile,
        },
        {
          summary: "Vaga presencial.",
          seniorityLevel: "Pleno",
          requiredSkills: ["React", "TypeScript"],
          desiredSkills: [],
          strategicRecommendations: [],
        },
      );

      expect(result.strategicRecommendations[0]).toContain(
        "Recomendação: Não recomendado",
      );
      const incompRec = result.strategicRecommendations.find((r) =>
        r.includes("Alerta de incompatibilidade"),
      );
      expect(incompRec).toBeDefined();
      expect(incompRec).toContain("Presencial ou Híbrida");
    });
  });
});

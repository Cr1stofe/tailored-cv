import type {
  JobApplicationDto,
  MasterProfileDto,
  TailoredResumeDto,
} from "@tailored-cv/types";
import { describe, expect, it, vi } from "vitest";
import {
  copyCoverLetter,
  createCoverLetter,
  getCoverLetterDraftKey,
  resolveCoverLetterLanguage,
} from "./cover-letter-draft";

const application = {
  company: "Orbita Commerce",
  position: "Pessoa Desenvolvedora Front-end",
  targetLanguage: "EN",
} as JobApplicationDto;

const profile = {
  fullName: "Cristofe Albuquerque",
  summary: "I build accessible interfaces.",
  skills: [{ name: "React" }, { name: "TypeScript" }],
  experiences: [],
} as unknown as MasterProfileDto;

describe("cover letter draft", () => {
  it("uses an independent draft key for each language and focus", () => {
    expect(getCoverLetterDraftKey("PT", "frontend")).toBe("PT:frontend");
    expect(getCoverLetterDraftKey("PT", "fullstack")).toBe("PT:fullstack");
    expect(getCoverLetterDraftKey("EN", "frontend")).toBe("EN:frontend");
  });

  it("uses the tailored resume language and factual content", () => {
    const resume = {
      language: "PT",
      reframedSummary: "Construo interfaces acessíveis.",
      highlightedSkills: ["React", "TypeScript"],
      tailoredExperiences: [],
    } as unknown as TailoredResumeDto;

    expect(resolveCoverLetterLanguage(application, resume)).toBe("PT");
    expect(
      createCoverLetter(application, profile, resume, "PT", "frontend"),
    ).toContain("Construo interfaces acessíveis.");
    expect(
      createCoverLetter(application, profile, resume, "PT", "frontend"),
    ).toContain("Orbita Commerce");
  });

  it("does not repeat an experience already covered by the resume summary", () => {
    const resume = {
      language: "PT",
      reframedSummary:
        "Entreguei a plataforma Ranking dos Políticos com foco em performance.",
      highlightedSkills: ["React", "TypeScript"],
      tailoredExperiences: [
        {
          company: "Olivas Digital",
          position: "Desenvolvedor Frontend",
          reframedHighlights: [
            "Entreguei a plataforma Ranking dos Políticos com foco em performance",
          ],
        },
      ],
    } as unknown as TailoredResumeDto;

    const letter = createCoverLetter(
      application,
      profile,
      resume,
      "PT",
      "frontend",
    );

    expect(letter.match(/Ranking dos Políticos/g)).toHaveLength(1);
    expect(letter).not.toContain(
      "Na minha experiência como Desenvolvedor Frontend",
    );
  });

  it("does not fall back to the original experience after a tailored match", () => {
    const resume = {
      language: "PT",
      reframedSummary:
        "O Ranking dos Políticos alcançou nota 99 no Lighthouse.",
      highlightedSkills: ["React", "TypeScript"],
      tailoredExperiences: [
        {
          company: "Olivas Digital",
          position: "Desenvolvedor Frontend",
          reframedHighlights: [
            "O Ranking dos Políticos foi desenvolvido em Next.js, React e TypeScript",
          ],
        },
      ],
    } as unknown as TailoredResumeDto;

    const letter = createCoverLetter(
      application,
      profile,
      resume,
      "PT",
      "frontend",
    );

    expect(letter).not.toContain("Na minha experiência como");
  });

  it("uses the standard company name and spacing for the Boticário role", () => {
    const letter = createCoverLetter(
      {
        ...application,
        company: "Boticario",
        position: "Pessoa Desenvolvedora Fullstack Node.js/React.js III",
      },
      profile,
      null,
      "PT",
      "fullstack",
    );

    expect(letter).toContain(
      "Pessoa Desenvolvedora Full Stack Node.js/React.js III no Grupo Boticário",
    );
  });

  it("does not repeat a skill when the summary already contains its base name", () => {
    const letter = createCoverLetter(
      application,
      profile,
      {
        language: "PT",
        reframedSummary: "Experiência sólida com Next.js e React.",
        highlightedSkills: ["Next.js (SSR, SSG, ISR)", "Zustand"],
      } as unknown as TailoredResumeDto,
      "PT",
      "frontend",
    );

    expect(letter).not.toContain("Next.js (SSR, SSG, ISR)");
    expect(letter).toContain("Zustand");
  });

  it("copies the complete letter when clipboard access is available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    await expect(
      copyCoverLetter({ writeText }, "Carta completa"),
    ).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("Carta completa");
  });

  it("reports clipboard failures", async () => {
    await expect(
      copyCoverLetter(
        { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
        "Carta",
      ),
    ).resolves.toBe(false);
  });
});

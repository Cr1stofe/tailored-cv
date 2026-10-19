import type { CoverLetterInput } from "../../ai.constants";
import { describe, expect, it, vi } from "vitest";
import { generateCoverLetterWithGemini } from "./cover-letter";
import { GeminiClient } from "./gemini-client";

const baseInput: CoverLetterInput = {
  company: "Grupo Boticário",
  position: "Pessoa Desenvolvedora Fullstack Node.js/React.js III",
  jobDescription:
    "Buscamos uma pessoa desenvolvedora com experiência em React, Node.js e PostgreSQL.",
  targetLanguage: "PT",
  focus: "fullstack",
  masterProfile: {
    fullName: "Cristofe Albuquerque",
    email: "cristofe@example.com",
    summary:
      "Desenvolvedor Full Stack com experiência em aplicações web e mobile em produção.",
    skills: [
      { name: "React", category: "PROFESSIONAL" },
      { name: "Node.js", category: "PROFESSIONAL" },
    ],
    experiences: [
      {
        company: "Olivas Digital",
        position: "Desenvolvedor Frontend",
        startDate: "2023-01",
        isCurrent: true,
        technologies: ["React", "Next.js", "TypeScript"],
        highlights: [
          "Desenvolvi o frontend do Ranking dos Políticos, com LCP de 1,4 s e nota 99 no Lighthouse.",
          "Participei da reestruturação do aplicativo Motul Expert, que possui mais de 100 mil downloads.",
        ],
      },
    ],
    projects: [
      {
        name: "Veltro LMS",
        description: "Plataforma de ensino full stack.",
        technologies: ["Next.js", "NestJS", "PostgreSQL", "Prisma"],
        highlights: [
          "Implementei controle de acesso baseado em papéis e sessões seguras.",
        ],
      },
    ],
    educations: [],
    certifications: [],
  },
};

function buildParagraph(
  language: "PT" | "EN" = "PT",
  opening = "Desenvolvi uma solução relacionada à oportunidade.",
): string {
  const words = opening.split(/\s+/);
  while (words.length < 45) {
    words.push(language === "EN" ? "experience" : "experiência");
  }
  return words.join(" ");
}

function validEvidenceParagraphs(language: "PT" | "EN" = "PT") {
  return [
    {
      content: buildParagraph(
        language,
        language === "EN"
          ? "I developed the frontend described in my professional experience."
          : "Desenvolvi o frontend descrito em minha experiência profissional.",
      ),
      evidenceIds: ["EXP_1_FACT_1"],
    },
    {
      content: buildParagraph(
        language,
        language === "EN"
          ? "I implemented role-based access control and secure sessions in Veltro LMS."
          : "Implementei controle de acesso baseado em papéis e sessões seguras no Veltro LMS.",
      ),
      evidenceIds: ["PROJECT_1_FACT_1"],
    },
  ];
}

function createClient(...responses: Array<string | Error>): {
  client: GeminiClient;
  generate: ReturnType<typeof vi.fn>;
} {
  const generate = vi.fn();
  responses.forEach((response) => {
    if (response instanceof Error) {
      generate.mockRejectedValueOnce(response);
    } else {
      generate.mockResolvedValueOnce(response);
    }
  });

  return {
    client: { generate } as unknown as GeminiClient,
    generate,
  };
}

describe("generateCoverLetterWithGemini", () => {
  it("accepts factual language without relying on a phrase blacklist", async () => {
    const evidenceParagraphs = validEvidenceParagraphs();
    evidenceParagraphs[0] = {
      content: buildParagraph(
        "PT",
        "O aplicativo alcançou mais de 100 mil downloads conforme registrado no perfil.",
      ),
      evidenceIds: ["EXP_1_FACT_2"],
    };
    const { client, generate } = createClient(
      JSON.stringify({ evidenceParagraphs }),
    );

    const result = await generateCoverLetterWithGemini(client, baseInput);

    expect(
      result.content.startsWith(
        "Gostaria de me candidatar à vaga de Pessoa Desenvolvedora Fullstack Node.js/React.js III na empresa Grupo Boticário.",
      ),
    ).toBe(true);
    expect(result.content).toContain(evidenceParagraphs[0]?.content);
    expect(result.content).toMatch(/Atenciosamente,\nCristofe Albuquerque$/);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it("repairs a response that references unknown evidence", async () => {
    const invalidParagraphs = validEvidenceParagraphs();
    invalidParagraphs[0] = {
      ...invalidParagraphs[0]!,
      evidenceIds: ["UNKNOWN_FACT"],
    };
    const validParagraphs = validEvidenceParagraphs();
    const { client, generate } = createClient(
      JSON.stringify({ evidenceParagraphs: invalidParagraphs }),
      JSON.stringify({ evidenceParagraphs: validParagraphs }),
    );

    const result = await generateCoverLetterWithGemini(client, baseInput);

    expect(result.content).toContain(validParagraphs[0]?.content);
    expect(generate).toHaveBeenCalledTimes(2);
    expect(generate.mock.calls[1]?.[0]).toContain(
      "Remove unknown evidence IDs: UNKNOWN_FACT",
    );
  });

  it("enforces the strict JSON response contract", async () => {
    const evidenceParagraphs = validEvidenceParagraphs();
    const { client, generate } = createClient(
      JSON.stringify({ evidenceParagraphs, commentary: "extra field" }),
      JSON.stringify({ evidenceParagraphs }),
    );

    await expect(
      generateCoverLetterWithGemini(client, baseInput),
    ).resolves.toBeDefined();
    expect(generate.mock.calls[1]?.[0]).toContain(
      "JSON does not match the required strict contract",
    );
  });

  it("reports the latest validation failure instead of a stale parse error", async () => {
    const evidenceParagraphs = validEvidenceParagraphs();
    evidenceParagraphs[0] = {
      content: "Curto demais.",
      evidenceIds: ["EXP_1_FACT_1"],
    };
    const { client } = createClient(
      "not-json",
      JSON.stringify({ evidenceParagraphs }),
    );

    await expect(
      generateCoverLetterWithGemini(client, baseInput),
    ).rejects.toThrow("Evidence paragraph 1");
  });

  it("does not duplicate provider retries handled by the queue", async () => {
    const providerError = new Error("Gemini unavailable");
    const { client, generate } = createClient(providerError);

    await expect(
      generateCoverLetterWithGemini(client, baseInput),
    ).rejects.toThrow("Gemini unavailable");
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it("includes only the requested language instructions", async () => {
    const englishInput: CoverLetterInput = {
      ...baseInput,
      targetLanguage: "EN",
    };
    const { client, generate } = createClient(
      JSON.stringify({ evidenceParagraphs: validEvidenceParagraphs("EN") }),
    );

    const result = await generateCoverLetterWithGemini(client, englishInput);

    const prompt = String(generate.mock.calls[0]?.[0]);
    expect(prompt).toContain("Write entirely in natural professional English");
    expect(
      result.content.startsWith(
        "I am applying for the Pessoa Desenvolvedora Fullstack Node.js/React.js III role at Grupo Boticário.",
      ),
    ).toBe(true);
    expect(result.content).toMatch(/Sincerely,\nCristofe Albuquerque$/);
    expect(prompt).not.toContain("Escreva inteiramente em português");
    expect(prompt).not.toContain("Atenciosamente,");
  });
});

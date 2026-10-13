import { describe, it, expect } from "vitest";
import {
  healthCheckSchema,
  sanitizeHeadline,
  formatResumeDate,
  localizeResumeProjectName,
  normalizePeriod,
  tailoringReportSchema,
} from "./index";

describe("Validation Schemas", () => {
  it("should validate valid health check data", () => {
    const validData = {
      status: "ok",
      service: "tailored-cv-api",
    };

    const result = healthCheckSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should fail on invalid health check status", () => {
    const invalidData = {
      status: "invalid_status",
      service: "tailored-cv-api",
    };

    const result = healthCheckSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("should sanitize headline by stripping seniority terms", () => {
    expect(
      sanitizeHeadline(
        "Senior Backend Engineer | Node.js, NestJS, Prisma & Clean Architecture",
      ),
    ).toBe("Backend Engineer | Node.js, NestJS, Prisma & Clean Architecture");

    expect(
      sanitizeHeadline(
        "Desenvolvedor Full Stack Sênior | React, Node.js e TypeScript",
      ),
    ).toBe("Desenvolvedor Full Stack | React, Node.js e TypeScript");

    expect(
      sanitizeHeadline("Lead Software Engineer | Cloud Architecture"),
    ).toBe("Software Engineer | Cloud Architecture");

    expect(
      sanitizeHeadline("Mid-level Frontend Developer | Next.js & React"),
    ).toBe("Frontend Developer | Next.js & React");

    expect(
      sanitizeHeadline("Software Engineer | NestJS, PostgreSQL & Docker"),
    ).toBe("Software Engineer | NestJS, PostgreSQL & Docker");

    expect(sanitizeHeadline("Dev Full Stack Ninja 🚀 (CLT/PJ)")).toBe(
      "Desenvolvedor Full Stack",
    );

    expect(sanitizeHeadline("Dev Front-end Rockstar 💻 [Remoto]")).toBe(
      "Desenvolvedor Front-end",
    );
    expect(sanitizeHeadline("Desenvolvedor(a) Front- end Pleno")).toBe(
      "Desenvolvedor Front-end",
    );

    expect(sanitizeHeadline("")).toBe("");
    expect(sanitizeHeadline(null)).toBe("");
  });

  it("should format ISO dates to standard resume MM/YYYY format", () => {
    expect(formatResumeDate("2023-07")).toBe("07/2023");
    expect(formatResumeDate("2024-02-15")).toBe("02/2024");
    expect(formatResumeDate("2026-07 (concluído)")).toBe("07/2026");
    expect(formatResumeDate("07/2023")).toBe("07/2023");
    expect(formatResumeDate("")).toBe("");
    expect(formatResumeDate(null)).toBe("");
  });

  it("should normalize resume period strings to clean ATS standard", () => {
    expect(normalizePeriod("2023-07 até Presente", false)).toBe(
      "07/2023 – Presente",
    );
    expect(normalizePeriod("2023-07 ate Presente", false)).toBe(
      "07/2023 – Presente",
    );
    expect(normalizePeriod("2023-07 até Presente", true)).toBe(
      "07/2023 – Present",
    );
    expect(normalizePeriod("2023-07 to Present", true)).toBe(
      "07/2023 – Present",
    );
    expect(normalizePeriod("07/2023 - Presente", false)).toBe(
      "07/2023 – Presente",
    );
    expect(normalizePeriod("2024-02 – 2026-07", false)).toBe(
      "02/2024 – 07/2026",
    );
    expect(normalizePeriod("")).toBe("");
  });

  it("translates generic project descriptors without changing product names", () => {
    expect(
      localizeResumeProjectName(
        "LMS – Plataforma de ensino Full Stack (Veltro LMS)",
        true,
      ),
    ).toBe("LMS – Full Stack E-Learning Platform (Veltro LMS)");
    expect(localizeResumeProjectName("Ranking dos Políticos", true)).toBe(
      "Ranking dos Políticos",
    );
    expect(localizeResumeProjectName("Portfólio Pessoal", true)).toBe(
      "Personal Portfolio",
    );
    expect(localizeResumeProjectName("Personal Portfolio", false)).toBe(
      "Portfólio Pessoal",
    );
  });

  it("validates the deterministic tailoring report contract", () => {
    const result = tailoringReportSchema.safeParse({
      highlighted: [{ item: "Portfólio Pessoal", reason: "Comprova CI." }],
      removed: [{ item: "Flutter", reason: "Menor relevância." }],
      uncovered_requirements: ["Obrigatório: Cypress"],
      match_score: 75,
      match_explanation: "3 de 4 requisitos obrigatórios cobertos.",
      warnings: [],
    });

    expect(result.success).toBe(true);
  });
});

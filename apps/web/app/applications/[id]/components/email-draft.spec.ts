import type {
  JobApplicationDto,
  MasterProfileDto,
  TailoredResumeDto,
} from "@tailored-cv/types";
import { describe, expect, it, vi } from "vitest";
import {
  buildMailtoUrl,
  copyEmailContent,
  createEmailBody,
  getEmailSubject,
  isValidRecipient,
  resolveEmailLanguage,
} from "./email-draft";

const application = {
  company: "Orbita Commerce",
  position: "Pessoa Desenvolvedora Front-end",
  targetLanguage: "EN",
} as JobApplicationDto;

const profile = { fullName: "Cristofe Albuquerque" } as MasterProfileDto;

describe("application email draft", () => {
  it("uses the application language when no tailored resume exists", () => {
    const language = resolveEmailLanguage(application, null);

    expect(language).toBe("EN");
    expect(getEmailSubject(language, "frontend")).toBe(
      "Application — Frontend Developer",
    );
    expect(
      createEmailBody(application, profile, language, "frontend"),
    ).toContain("Hello,");
  });

  it("prefers the tailored resume language when it exists", () => {
    const language = resolveEmailLanguage(application, {
      language: "PT",
    } as TailoredResumeDto);

    expect(language).toBe("PT");
    expect(getEmailSubject(language, "fullstack")).toBe(
      "Candidatura — Desenvolvedor Full Stack",
    );
    expect(
      createEmailBody(application, profile, language, "fullstack"),
    ).toContain("Olá,");
  });

  it("validates recipient addresses", () => {
    expect(isValidRecipient("recrutador@empresa.com")).toBe(true);
    expect(isValidRecipient("recrutador empresa.com")).toBe(false);
    expect(isValidRecipient("recrutador@empresa")).toBe(false);
  });

  it("builds an encoded mailto URL", () => {
    const url = buildMailtoUrl(
      " recrutador@empresa.com ",
      "Candidatura — Front-end",
      "Olá,\nSegue meu currículo.",
    );

    expect(url).toBe(
      "mailto:recrutador%40empresa.com?subject=Candidatura%20%E2%80%94%20Front-end&body=Ol%C3%A1%2C%0ASegue%20meu%20curr%C3%ADculo.",
    );
  });

  it("reports clipboard success and failure", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const clipboard = { writeText };

    await expect(copyEmailContent(clipboard, "Subject", "Body")).resolves.toBe(
      true,
    );
    expect(writeText).toHaveBeenCalledWith("Assunto: Subject\n\nBody");

    await expect(
      copyEmailContent(
        { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
        "Subject",
        "Body",
      ),
    ).resolves.toBe(false);
  });
});

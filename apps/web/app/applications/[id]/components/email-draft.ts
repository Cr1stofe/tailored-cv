import type {
  JobApplicationDto,
  MasterProfileDto,
  SupportedLanguage,
  TailoredResumeDto,
} from "@tailored-cv/types";

export type EmailFocus = "frontend" | "fullstack";

export function resolveEmailLanguage(
  application: JobApplicationDto,
  tailoredResume: TailoredResumeDto | null,
): SupportedLanguage {
  return tailoredResume?.language ?? application.targetLanguage;
}

export function createEmailBody(
  application: JobApplicationDto,
  profile: MasterProfileDto | null,
  language: SupportedLanguage,
  focus: EmailFocus,
): string {
  const focusContent =
    focus === "frontend"
      ? language === "EN"
        ? "My background includes experience with React, TypeScript, JavaScript, Next.js, responsive interfaces, componentization, and web performance."
        : "Meu perfil reúne experiência com React, TypeScript, JavaScript, Next.js, interfaces responsivas, componentização e performance web."
      : language === "EN"
        ? "My background includes experience with React, TypeScript, JavaScript, Next.js, Node.js, NestJS, REST APIs, relational databases, and authentication."
        : "Meu perfil reúne experiência com React, TypeScript, JavaScript, Next.js, Node.js, NestJS, APIs RESTful, bancos de dados relacionais e autenticação.";

  const position = application.position || "opportunity";
  const company = application.company
    ? language === "EN"
      ? ` position at ${application.company}`
      : ` na ${application.company}`
    : language === "EN"
      ? " position"
      : "";

  const lines =
    language === "EN"
      ? [
          "Hello,",
          "",
          `I would like to apply for the ${position}${company}.`,
          "",
          focusContent,
          "",
          "Please find my resume attached for your consideration.",
          "",
          "Thank you for your time. I remain available for any further information.",
          "",
          "Best regards,",
          profile?.fullName || "",
        ]
      : [
          "Olá,",
          "",
          `Gostaria de me candidatar à vaga de ${position}${company}.`,
          "",
          focusContent,
          "",
          "Segue meu currículo em anexo para avaliação.",
          "",
          "Obrigado pela atenção e fico à disposição para qualquer informação adicional.",
          "",
          "Atenciosamente,",
          profile?.fullName || "",
        ];

  return lines
    .filter((line, index) => line || (index > 0 && lines[index - 1]))
    .join("\n");
}

export function getEmailSubject(
  language: SupportedLanguage,
  focus: EmailFocus,
): string {
  const focusLabel =
    focus === "frontend"
      ? language === "EN"
        ? "Frontend"
        : "Front-end"
      : "Full Stack";

  return language === "EN"
    ? `Application — ${focusLabel} Developer`
    : `Candidatura — Desenvolvedor ${focusLabel}`;
}

export function isValidRecipient(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function buildMailtoUrl(
  recipient: string,
  subject: string,
  body: string,
): string {
  return `mailto:${encodeURIComponent(recipient.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export async function copyEmailContent(
  clipboard: Pick<Clipboard, "writeText"> | undefined,
  subject: string,
  body: string,
): Promise<boolean> {
  if (!clipboard) return false;

  try {
    await clipboard.writeText(`Assunto: ${subject}\n\n${body}`);
    return true;
  } catch {
    return false;
  }
}

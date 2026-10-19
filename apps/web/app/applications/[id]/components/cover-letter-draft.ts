import type {
  JobApplicationDto,
  MasterProfileDto,
  SupportedLanguage,
  TailoredResumeDto,
} from "@tailored-cv/types";

export type CoverLetterFocus = "frontend" | "fullstack";

export function getCoverLetterDraftKey(
  language: SupportedLanguage,
  focus: CoverLetterFocus,
): string {
  return `${language}:${focus}`;
}

export function resolveCoverLetterLanguage(
  application: JobApplicationDto,
  tailoredResume: TailoredResumeDto | null,
): SupportedLanguage {
  return tailoredResume?.language ?? application.targetLanguage;
}

function getFocusLabel(language: SupportedLanguage, focus: CoverLetterFocus) {
  if (focus === "frontend") {
    return language === "EN"
      ? "front-end development"
      : "desenvolvimento front-end";
  }

  return language === "EN"
    ? "full-stack development"
    : "desenvolvimento full-stack";
}

function formatCompanyName(company: string | null | undefined) {
  if (!company) return "";

  const normalized = company
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .trim();

  if (["boticario", "o boticario", "grupo boticario"].includes(normalized)) {
    return "Grupo Boticário";
  }

  return company;
}

function formatPosition(position: string) {
  return position.replace(/fullstack/gi, "Full Stack");
}

function formatCompanyPreposition(
  company: string,
  language: SupportedLanguage,
) {
  if (language === "EN") return `at ${company}`;
  return company.startsWith("Grupo ") ? `no ${company}` : `em ${company}`;
}

function isCoveredBySummary(value: string | undefined, summary: string) {
  if (!value) return false;

  const normalizedSummary = summary.toLocaleLowerCase();
  const distinctivePhrase = value.split(/[:.;,]/, 1)[0]?.trim() || value;
  const distinctiveWords = distinctivePhrase
    .toLocaleLowerCase()
    .split(/\s+/)
    .filter((word) => word.length >= 5);
  const matchingWords = distinctiveWords.filter((word) =>
    normalizedSummary.includes(word),
  );

  return (
    normalizedSummary.includes(value.toLocaleLowerCase()) ||
    (distinctivePhrase.length >= 12 &&
      (normalizedSummary.includes(distinctivePhrase.toLocaleLowerCase()) ||
        (distinctiveWords.length >= 2 && matchingWords.length >= 2)))
  );
}

function getExperienceParagraph(
  language: SupportedLanguage,
  profile: MasterProfileDto | null,
  tailoredResume: TailoredResumeDto | null,
  summary: string,
) {
  const experiences = tailoredResume?.tailoredExperiences?.length
    ? tailoredResume.tailoredExperiences
    : profile?.experiences || [];
  const experience = experiences.find((item) => {
    const highlight =
      "reframedHighlights" in item
        ? item.reframedHighlights[0]
        : item.highlights[0];
    return ![item.company, item.position, highlight].some((value) =>
      isCoveredBySummary(value, summary),
    );
  });
  const highlight =
    experience && "reframedHighlights" in experience
      ? experience.reframedHighlights[0]
      : experience?.highlights?.[0];

  if (!experience) return "";

  if (language === "EN") {
    return `In my experience as ${experience.position} at ${experience.company}, I developed expertise that I can bring to this opportunity${highlight ? `, including ${highlight.charAt(0).toLowerCase()}${highlight.slice(1)}` : ""}.`;
  }

  return `Na minha experiência como ${experience.position} na ${experience.company}, desenvolvi experiência que posso aplicar nesta oportunidade${highlight ? `, incluindo ${highlight.charAt(0).toLowerCase()}${highlight.slice(1)}` : ""}.`;
}

export function createCoverLetter(
  application: JobApplicationDto,
  profile: MasterProfileDto | null,
  tailoredResume: TailoredResumeDto | null,
  language: SupportedLanguage,
  focus: CoverLetterFocus,
): string {
  const position =
    formatPosition(application.position) ||
    (language === "EN" ? "this opportunity" : "esta oportunidade");
  const company = formatCompanyName(application.company);
  const focusLabel = getFocusLabel(language, focus);
  const summary = tailoredResume?.reframedSummary || profile?.summary;
  const experienceParagraph = getExperienceParagraph(
    language,
    profile,
    tailoredResume,
    summary || "",
  );
  const skills = (
    tailoredResume?.highlightedSkills ||
    profile?.skills?.slice(0, 5).map((skill) => skill.name) ||
    []
  )
    .filter(
      (skill) =>
        !summary
          ?.toLocaleLowerCase()
          .includes(
            (skill.split("(", 1)[0] || skill).trim().toLocaleLowerCase(),
          ),
    )
    .slice(0, 5)
    .join(", ");
  const supportingParagraph =
    experienceParagraph ||
    (skills
      ? language === "EN"
        ? `I also have experience with ${skills}, which I believe aligns well with the needs of this role.`
        : `Além disso, tenho experiência com ${skills}, competências que acredito estarem alinhadas às necessidades da vaga.`
      : summary
        ? ""
        : language === "EN"
          ? "My experience and professional background align well with the needs of this role."
          : "Minha experiência profissional está alinhada às necessidades desta oportunidade.");

  const paragraphs =
    language === "EN"
      ? [
          "Dear Hiring Manager,",
          `I am writing to express my interest in the ${position}${company ? ` role ${formatCompanyPreposition(company, language)}` : ""}. My experience in ${focusLabel} has prepared me to contribute to the team with practical, production-focused solutions.`,
          summary ||
            "My background combines hands-on technical experience with a practical, collaborative approach to delivering reliable solutions.",
          ...(supportingParagraph ? [supportingParagraph] : []),
          "I would welcome the opportunity to discuss how my background can contribute to your team. Thank you for your time and consideration.",
          "Sincerely,",
          profile?.fullName || "",
        ]
      : [
          "Prezado time de recrutamento,",
          `Gostaria de me candidatar à vaga de ${position}${company ? ` ${formatCompanyPreposition(company, language)}` : ""}. Minha experiência em ${focusLabel} me preparou para contribuir com soluções práticas e orientadas à produção.`,
          summary ||
            "Meu perfil combina experiência técnica prática com uma abordagem colaborativa e orientada à entrega de soluções confiáveis.",
          ...(supportingParagraph ? [supportingParagraph] : []),
          "Gostaria de ter a oportunidade de conversar sobre como posso contribuir com a equipe. Obrigado pela atenção e consideração.",
          "Atenciosamente,",
          profile?.fullName || "",
        ];

  return paragraphs.join("\n\n");
}

export function getCoverLetterTitle(
  language: SupportedLanguage,
  focus: CoverLetterFocus,
): string {
  const focusLabel =
    focus === "frontend"
      ? language === "EN"
        ? "Front-end"
        : "Front-end"
      : "Full Stack";
  return language === "EN"
    ? `Cover Letter — ${focusLabel} Developer`
    : `Carta de Apresentação — Desenvolvedor ${focusLabel}`;
}

export async function copyCoverLetter(
  clipboard: Pick<Clipboard, "writeText"> | undefined,
  content: string,
): Promise<boolean> {
  if (!clipboard) return false;

  try {
    await clipboard.writeText(content);
    return true;
  } catch {
    return false;
  }
}

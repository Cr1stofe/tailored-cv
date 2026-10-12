import type { MasterProfileDto, TailorResumeInput } from "@tailored-cv/types";
import type { TailoredResumeDraft } from "@tailored-cv/validation";

export type ResumeQualityIssueCode =
  | "UNSUPPORTED_TECHNOLOGY"
  | "UNSUPPORTED_NUMBER"
  | "SUMMARY_FACT_REMOVED"
  | "INVALID_SPELLING"
  | "PAGE_LENGTH"
  | "RESPONSIBILITY_INFLATION"
  | "UNGROUNDED_BULLET"
  | "DUPLICATED_RESULT"
  | "IRRELEVANT_ORDER"
  | "RELEVANT_PROJECT_OMITTED"
  | "EMPTY_DELIMITERS"
  | "UNSUPPORTED_SENIORITY"
  | "HEADLINE_SUMMARY_MISMATCH"
  | "SUMMARY_BODY_MISMATCH"
  | "UNSUPPORTED_SECTION_TECHNOLOGY"
  | "MISSING_PROJECT_LINK"
  | "MISSING_RELEVANT_SKILL"
  | "STRONG_RESULT_OMITTED";

export interface ResumeQualityIssue {
  code: ResumeQualityIssueCode;
  message: string;
}

export interface ResumeQualityResult {
  valid: boolean;
  errors: ResumeQualityIssue[];
  warnings: string[];
  estimatedLines: number;
  wordCount: number;
}

export const TECH_PATTERNS: Array<[string, RegExp]> = [
  ["react", /\breact(?:\.js)?\b/gi],
  ["nextjs", /\bnext\s*\.?\s*js(?:\s+\d+)?\b/gi],
  ["nodejs", /\bnode\s*\.?\s*js(?:\s+\d+)?\b/gi],
  ["nestjs", /\bnest\s*js(?:\s+\d+)?\b/gi],
  ["typescript", /\btype\s*script\b/gi],
  ["javascript", /\bjava\s*script\b/gi],
  ["githubactions", /\bgithub\s+actions\b/gi],
  ["testinglibrary", /\btesting\s+library\b/gi],
  ["reacthookform", /\breact\s+hook\s+form\b/gi],
  ["tailwindcss", /\btailwind(?:\s+css)?\b/gi],
  ["postgresql", /\bpostgres(?:ql)?\b/gi],
  ["dockercompose", /\bdocker\s+compose\b/gi],
  ["oraclecloud", /\b(?:oracle\s+cloud|oci)\b/gi],
  ["cloudflare", /\bcloudflare\b/gi],
  ["wordpress", /\bwordpress\b/gi],
  ["flutter", /\bflutter\b/gi],
  ["dart", /\bdart\b/gi],
  ["angular", /\bangular\b/gi],
  ["vue", /\bvue(?:\.js)?\b/gi],
  ["cypress", /\bcypress\b/gi],
  ["playwright", /\bplaywright\b/gi],
  ["graphql", /\bgraphql\b/gi],
  ["kubernetes", /\bkubernetes\b/gi],
  ["aws", /\baws\b/gi],
  ["vitest", /\bvitest\b/gi],
  ["jest", /\bjest\b/gi],
  ["prisma", /\bprisma\b/gi],
  ["zustand", /\bzustand\b/gi],
  ["zod", /\bzod\b/gi],
  ["turborepo", /\bturborepo\b/gi],
  ["express", /\bexpress\b/gi],
  ["nginx", /\bnginx\b/gi],
  ["caddy", /\bcaddy\b/gi],
];

export const SPELLING_RULES: Array<[RegExp, string]> = [
  [/\bNext\.\s+js\b/gi, 'Use a grafia oficial "Next.js".'],
  [/\bNode\.\s+js\b/gi, 'Use a grafia oficial "Node.js".'],
  [/\bNextjs\b/gi, 'Use a grafia oficial "Next.js".'],
  [/\bNodejs\b/gi, 'Use a grafia oficial "Node.js".'],
  [/\bTypescript\b/g, 'Use a grafia oficial "TypeScript".'],
  [/\bJavascript\b/g, 'Use a grafia oficial "JavaScript".'],
  [/\bGithub Actions\b/g, 'Use a grafia oficial "GitHub Actions".'],
  [/\bIntegreei\b/gi, 'Erro de digitação: use "Integrei".'],
  [/\S {2,}\S/g, "Remova espaços duplicados."],
];

export const PARTICIPATION_VERBS = [
  "participei",
  "contribui",
  "auxiliei",
  "apoiei",
  "colaborei",
  "participated",
  "contributed",
  "assisted",
  "supported",
  "collaborated",
];

export const AUTHORSHIP_VERBS = [
  "desenvolvi",
  "reestruturei",
  "implementei",
  "arquitetei",
  "criei",
  "liderei",
  "construi",
  "developed",
  "restructured",
  "implemented",
  "architected",
  "created",
  "led",
  "built",
];

export const SENIORITY_PATTERN =
  /\b(junior|júnior|jr\.?|pleno|pl\.?|senior|sênior|sr\.?|especialista|mid(?:-level)?|lead|staff|principal)\b/gi;

export const STRONG_RESULT_PATTERN =
  /\b\d+(?:[.,]\d+)?\s*(?:%|mil(?:h(?:ão|ões|oes))?|k|m|downloads?)\b/iu;

export const INFORMAL_TITLE_PATTERN =
  /\b(ninja|rockstar|guru|jedi|wizard|mago|hacker|evangelist|astro|campe[ãa]o)\b/gi;

export const EMOJI_PATTERN =
  /[\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;

export const RELATED_TECH_FAMILIES: Array<{
  domain: string;
  variants: Array<[string, RegExp]>;
}> = [
  {
    domain: "gerenciamento de estado",
    variants: [
      ["NgRx", /\bngrx\b/i],
      ["Vuex", /\bvuex\b/i],
      ["Pinia", /\bpinia\b/i],
      ["MobX", /\bmobx\b/i],
      ["Zustand", /\bzustand\b/i],
      ["Redux", /\bredux(?:\s+toolkit)?\b/i],
    ],
  },
  {
    domain: "framework frontend SPA",
    variants: [
      ["Angular", /\bangular(?:\s*\d+)?\b/i],
      ["Vue.js", /\bvue(?:\.js)?\b/i],
      ["Svelte", /\bsvelte\b/i],
      ["React", /\breact(?:\.js)?\b/i],
      ["Next.js", /\bnext(?:\.js)?\b/i],
    ],
  },
  {
    domain: "ORM / Acesso a dados",
    variants: [
      ["TypeORM", /\btypeorm\b/i],
      ["Sequelize", /\bsequelize\b/i],
      ["Drizzle", /\bdrizzle(?:-orm)?\b/i],
      ["Hibernate", /\bhibernate\b/i],
      ["Prisma", /\bprisma\b/i],
    ],
  },
  {
    domain: "provedores de nuvem",
    variants: [
      ["AWS", /\baws\b/i],
      ["Azure", /\bazure\b/i],
      ["GCP", /\b(?:gcp|google\s+cloud)\b/i],
      ["Oracle Cloud (OCI)", /\b(?:oracle\s+cloud|oci)\b/i],
      ["Cloudflare", /\bcloudflare\b/i],
    ],
  },
  {
    domain: "testes automatizados",
    variants: [
      ["Cypress", /\bcypress\b/i],
      ["Playwright", /\bplaywright\b/i],
      ["Selenium", /\bselenium\b/i],
      ["Vitest", /\bvitest\b/i],
      ["Jest", /\bjest\b/i],
      ["Testing Library", /\btesting\s+library\b/i],
    ],
  },
  {
    domain: "desenvolvimento mobile",
    variants: [
      ["React Native", /\breact\s+native\b/i],
      ["Swift", /\bswift\b/i],
      ["Kotlin", /\bkotlin\b/i],
      ["Flutter", /\bflutter\b/i],
    ],
  },
  {
    domain: "frameworks backend Node",
    variants: [
      ["Fastify", /\bfastify\b/i],
      ["Koa", /\bkoa\b/i],
      ["Express", /\bexpress\b/i],
      ["NestJS", /\bnest\s*js\b/i],
    ],
  },
];

export const STOP_WORDS = new Set([
  "a",
  "as",
  "com",
  "da",
  "das",
  "de",
  "do",
  "dos",
  "e",
  "em",
  "na",
  "no",
  "o",
  "os",
  "para",
  "por",
  "the",
  "and",
  "for",
  "of",
  "to",
  "with",
]);

export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function splitSentences(value: string): string[] {
  const marker = "__INTERNAL_DOT__";
  const protectedText = value.replace(
    /([A-Za-z])\.([A-Za-z])/g,
    `$1${marker}$2`,
  );
  return (
    protectedText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [protectedText]
  ).map((sentence) => sentence.replaceAll(marker, "."));
}

export function normalizeTechnology(value: string): string {
  const normalized = normalizeText(value)
    .replace(/\s+/g, "")
    .replace(/\([^)]*\)/g, "");

  const aliases: Record<string, string> = {
    next: "nextjs",
    nextjs: "nextjs",
    node: "nodejs",
    nodejs: "nodejs",
    nest: "nestjs",
    nestjs: "nestjs",
    postgres: "postgresql",
    postgresql: "postgresql",
    githubaction: "githubactions",
    githubactions: "githubactions",
    reactjs: "react",
    vuejs: "vue",
    tailwind: "tailwindcss",
    oci: "oraclecloud",
    apirest: "apisrest",
    apisrest: "apisrest",
    restapi: "apisrest",
    restapis: "apisrest",
    restfulapi: "apisrest",
    restfulapis: "apisrest",
  };
  return aliases[normalized] || normalized;
}

export function technologyVariants(value: string): string[] {
  const withoutParenthetical = value.replace(/\([^)]*\)/g, "").trim();
  const parts = value.split(/[,;&/]|\s+e\s+/gi).map((part) => part.trim());
  return Array.from(
    new Set(
      [value, withoutParenthetical, ...parts]
        .map(normalizeTechnology)
        .filter((item) => item.length >= 2),
    ),
  );
}

export function masterTechnologySet(profile: MasterProfileDto): Set<string> {
  const values = [
    ...profile.skills.map((skill) => skill.name),
    ...profile.experiences.flatMap((experience) => experience.technologies),
    ...profile.projects.flatMap((project) => project.technologies),
  ];
  const technologies = new Set(values.flatMap(technologyVariants));
  const text = profileText(profile);
  for (const [technology, pattern] of TECH_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) technologies.add(technology);
  }
  return technologies;
}

export function outputText(output: TailoredResumeDraft): string {
  return [
    output.targetedHeadline || "",
    output.reframedSummary,
    ...output.highlightedSkills,
    ...output.tailoredExperiences.flatMap((experience) => [
      experience.position,
      experience.location || "",
      ...experience.technologies,
      ...experience.reframedHighlights,
    ]),
    ...(output.tailoredProjects || []).flatMap((project) => [
      project.name,
      project.description,
      project.url || "",
      ...project.technologies,
      ...project.reframedHighlights,
    ]),
  ].join("\n");
}

export function outputBodyText(output: TailoredResumeDraft): string {
  return [
    ...output.highlightedSkills,
    ...output.tailoredExperiences.flatMap((experience) => [
      ...experience.technologies,
      ...experience.reframedHighlights,
    ]),
    ...(output.tailoredProjects || []).flatMap((project) => [
      project.name,
      project.description,
      project.url || "",
      ...project.technologies,
      ...project.reframedHighlights,
    ]),
  ].join("\n");
}

export function findUnsupportedTechnologies(
  profile: MasterProfileDto,
  text: string,
): string[] {
  const allowed = masterTechnologySet(profile);
  return TECH_PATTERNS.filter(([, pattern]) => {
    pattern.lastIndex = 0;
    return pattern.test(text);
  })
    .map(([technology]) => technology)
    .filter((technology) => !allowed.has(technology));
}

export function profileText(profile: MasterProfileDto): string {
  return [
    profile.summary || "",
    ...profile.skills.map((skill) => skill.name),
    ...(profile.educations || []).map(
      (edu) =>
        `${edu.institution} ${edu.degree || ""} ${edu.fieldOfStudy || ""}`,
    ),
    ...(profile.certifications || []).map(
      (cert) => `${cert.name} ${cert.issuer}`,
    ),
    ...profile.experiences.flatMap((experience) => [
      experience.position,
      experience.startDate,
      experience.endDate || "",
      ...experience.technologies,
      ...experience.highlights,
    ]),
    ...profile.projects.flatMap((project) => [
      project.name,
      project.description,
      ...project.technologies,
      ...project.highlights,
    ]),
  ].join("\n");
}

export function outputTechnologies(output: TailoredResumeDraft): Set<string> {
  const explicit = [
    ...output.highlightedSkills,
    ...output.tailoredExperiences.flatMap(
      (experience) => experience.technologies,
    ),
    ...(output.tailoredProjects || []).flatMap(
      (project) => project.technologies,
    ),
  ].flatMap(technologyVariants);
  const text = outputText(output);
  const detected = TECH_PATTERNS.filter(([, pattern]) => {
    pattern.lastIndex = 0;
    return pattern.test(text);
  }).map(([technology]) => technology);
  return new Set([...explicit, ...detected]);
}

export function canonicalNumber(raw: string): string {
  const compact = raw.toLowerCase().replace(/\s+/g, " ").trim();
  const numeric = compact.match(/\d+(?:[.,]\d+)?/)?.[0] || compact;
  const isThousands = /^\d{1,3}\.\d{3}$/.test(numeric);
  const parsed = Number(
    isThousands ? numeric.replace(".", "") : numeric.replace(",", "."),
  );
  const multiplier = /(?:\bmil\b|k\b|\bthousands?\b)/.test(compact)
    ? 1_000
    : /(?:\b(?:milhao|milhão|milhoes|milhões|millions?)\b|m\b)/.test(compact)
      ? 1_000_000
      : 1;
  const unit = compact.includes("%")
    ? "%"
    : /\bms\b/.test(compact)
      ? "ms"
      : /\bs\b/.test(compact)
        ? "s"
        : "";
  return `${Number.isFinite(parsed) ? parsed * multiplier : numeric}${unit}`;
}

export function extractNumbers(text: string): Set<string> {
  const matches = text.match(
    /\b\d+(?:[.,]\d+)?\s*\+?(?:\s*(?:%|mil(?:h(?:ão|oes|ões))?|thousands?|millions?|k|m|ms|s|anos?|years?|downloads?))?\+?/giu,
  );
  return new Set((matches || []).map(canonicalNumber));
}

export function tokenize(value: string): Set<string> {
  return new Set(
    normalizeText(value)
      .split(" ")
      .filter((token) => token.length >= 3 && !STOP_WORDS.has(token)),
  );
}

export function similarity(a: string, b: string): number {
  const left = tokenize(a);
  const right = tokenize(b);
  if (left.size === 0 || right.size === 0) return 0;
  const intersection = [...left].filter((token) => right.has(token)).length;
  return intersection / Math.max(left.size, right.size);
}

export function bestSourceBullet(
  bullet: string,
  sources: string[],
): { text: string; score: number } | null {
  return sources.reduce<{ text: string; score: number } | null>(
    (best, source) => {
      const score = similarity(bullet, source);
      return !best || score > best.score ? { text: source, score } : best;
    },
    null,
  );
}

export function containsVerb(text: string, verbs: string[]): boolean {
  const normalized = normalizeText(text);
  return verbs.some((verb) =>
    new RegExp(`(?:^| )${verb}(?: |$)`, "i").test(normalized),
  );
}

export function startsWithVerb(text: string, verbs: string[]): boolean {
  const firstWord = normalizeText(text).split(" ")[0];
  return Boolean(firstWord && verbs.includes(firstWord));
}

export function jobTerms(input: TailorResumeInput): string[] {
  const structured = [
    ...(input.jobAnalysis?.requiredSkills || []),
    ...(input.jobAnalysis?.desiredSkills || []),
    ...(input.jobAnalysis?.keywords || []),
  ];
  const profileTechnologies = [
    ...input.masterProfile.skills.map((skill) => skill.name),
    ...input.masterProfile.experiences.flatMap(
      (experience) => experience.technologies,
    ),
    ...input.masterProfile.projects.flatMap((project) => project.technologies),
  ];
  const job = normalizeText(`${input.position} ${input.jobDescription}`);
  const inferred = profileTechnologies.filter((technology) =>
    technologyVariants(technology).some((variant) =>
      job.replace(/[^a-z0-9]/g, "").includes(variant),
    ),
  );
  return Array.from(
    new Set([...structured, ...inferred].map(normalizeText).filter(Boolean)),
  );
}

export function technologyAppearsInText(
  technology: string,
  text: string,
): boolean {
  const compactText = normalizeText(text).replace(/\s+/g, "");
  const normalizedTechnology = normalizeTechnology(technology);
  if (normalizedTechnology.startsWith("streamingdemidia")) {
    return compactText.includes("streaming") && compactText.includes("http206");
  }
  return technologyVariants(technology).some((variant) =>
    compactText.includes(variant),
  );
}

export function removeTechnologyFromRole(
  role: string,
  technology: string,
): string {
  const escaped = technology
    .replace(/\([^)]*\)/g, "")
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\\\./g, "\\.?\\s*");
  return role
    .replace(new RegExp(`\\s*[-–—|/]?\\s*${escaped}\\s*$`, "i"), "")
    .trim();
}

export function profileCoversRequirement(
  profile: MasterProfileDto,
  requirement: string,
): boolean {
  const normReq = normalizeText(requirement);

  if (/\b(ingles|english)\b/.test(normReq)) {
    const hasEnglish =
      (profile.certifications || []).some((c) =>
        /\b(ingl[eê]s|english)\b/i.test(`${c.name} ${c.issuer}`),
      ) ||
      (profile.skills || []).some((s) =>
        /\b(ingl[eê]s|english)\b/i.test(s.name),
      ) ||
      /\b(ingl[eê]s|english)\b/i.test(profile.summary || "") ||
      Boolean(profile.englishCv);
    if (hasEnglish) return true;
  }
  if (/\b(espanhol|spanish)\b/.test(normReq)) {
    const hasSpanish =
      (profile.certifications || []).some((c) =>
        /\b(espanhol|spanish)\b/i.test(`${c.name} ${c.issuer}`),
      ) ||
      (profile.skills || []).some((s) =>
        /\b(espanhol|spanish)\b/i.test(s.name),
      ) ||
      /\b(espanhol|spanish)\b/i.test(profile.summary || "");
    if (hasSpanish) return true;
  }

  const normalizedRequirement = normalizeTechnology(requirement);
  const technologies = masterTechnologySet(profile);
  if (technologies.has(normalizedRequirement)) return true;

  for (const tech of technologies) {
    if (tech.length < 2) continue;
    const pattern = new RegExp(`\\b${tech}\\b`, "i");
    if (pattern.test(normReq)) {
      return true;
    }
  }

  if (/\bhtml\b/.test(normReq) && technologies.has("html")) return true;
  if (
    /\bcss\b/.test(normReq) &&
    (technologies.has("css") || technologies.has("scss"))
  )
    return true;
  if (/\bjavascript\b/.test(normReq) && technologies.has("javascript"))
    return true;
  if (
    /\b(?:apis?\s*)?rest\b/.test(normReq) &&
    (technologies.has("apirest") || technologies.has("rest"))
  )
    return true;
  if (/\bgit\b/.test(normReq) && technologies.has("git")) return true;
  if (
    /\b(?:testing\s*library|rtl)\b/.test(normReq) &&
    technologies.has("testinglibrary")
  )
    return true;
  if (
    /\bcore\s*web\s*vitals\b/.test(normReq) &&
    (technologies.has("corewebvitals") ||
      profileText(profile).toLowerCase().includes("core web vitals"))
  )
    return true;

  const normalizedProfile = normalizeText(profileText(profile));
  const tokens = normReq
    .split(" ")
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
  if (
    tokens.length > 0 &&
    tokens.every((token) => normalizedProfile.includes(token))
  ) {
    return true;
  }

  if (tokens.length >= 4) {
    const presentCount = tokens.filter((t) =>
      normalizedProfile.includes(t),
    ).length;
    if (presentCount / tokens.length >= 0.7) return true;
  }

  return false;
}

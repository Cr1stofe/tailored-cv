import { MasterProfileDto } from "@tailored-cv/types";

export interface CategorizedResumeSkills {
  frontend: string[];
  backend: string[];
  testing: string[];
  devOps: string[];
  performance: string[];
  additional: string[];
}

const SKILL_GROUPS: Array<[keyof CategorizedResumeSkills, RegExp]> = [
  [
    "frontend",
    /react|next|javascript|typescript|html|css|scss|tailwind|zustand|redux|hook form|flutter|dart|wordpress/i,
  ],
  [
    "backend",
    /node|nest|express|postgres|prisma|sql|api|graphql|jwt|rbac|argon|sessões|sessions|streaming/i,
  ],
  ["testing", /vitest|jest|testing library|cypress|playwright/i],
  [
    "performance",
    /lighthouse|core web vitals|web vitals|performance web|page speed/i,
  ],
  [
    "devOps",
    /docker|github actions|ci(?:\/cd)?|linux|caddy|nginx|cloud|aws|oracle|turborepo/i,
  ],
];

const FRONTEND_DISPLAY_ORDER = [
  "react",
  "typescript",
  "next.js",
  "javascript",
  "html",
  "css",
  "scss",
  "zustand",
  "redux",
  "tailwind css",
];

function frontendSkillPriority(skill: string): number {
  const normalized = skill.trim().toLowerCase();
  const index = FRONTEND_DISPLAY_ORDER.findIndex(
    (term) => normalized === term || normalized.startsWith(`${term} `),
  );
  return index === -1 ? FRONTEND_DISPLAY_ORDER.length : index;
}

export function extractCategorizedSkills(
  profile: MasterProfileDto | null | undefined,
  highlightedSkills?: string[] | null,
): CategorizedResumeSkills {
  const skills = profile?.skills || [];
  const requestedCount = highlightedSkills?.length || 0;
  const targetCount = requestedCount
    ? Math.min(20, Math.max(12, requestedCount))
    : 20;
  const byName = new Map(
    skills.map((skill) => [skill.name.toLowerCase(), skill]),
  );
  const selected = new Set<string>();
  const ordered = (highlightedSkills || [])
    .map((skill) => byName.get(skill.trim().toLowerCase()))
    .filter((skill): skill is (typeof skills)[number] => Boolean(skill));

  for (const skill of skills) {
    if (ordered.length >= targetCount) break;
    if (!selected.has(skill.name.toLowerCase())) ordered.push(skill);
  }

  const selectedSkills = ordered.filter((skill) => {
    const key = skill.name.toLowerCase();
    if (selected.has(key)) return false;
    selected.add(key);
    return true;
  });

  return categorizeResumeSkills(selectedSkills.map((skill) => skill.name));
}

export function categorizeResumeSkills(
  skillNames: string[],
): CategorizedResumeSkills {
  const groups = skillNames.reduce<CategorizedResumeSkills>(
    (groups, skill) => {
      const group = SKILL_GROUPS.find(([, pattern]) =>
        pattern.test(skill),
      )?.[0];
      groups[group || "additional"].push(skill);
      return groups;
    },
    {
      frontend: [],
      backend: [],
      testing: [],
      devOps: [],
      performance: [],
      additional: [],
    },
  );

  groups.frontend.sort(
    (a, b) => frontendSkillPriority(a) - frontendSkillPriority(b),
  );
  return groups;
}

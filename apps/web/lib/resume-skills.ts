import { MasterProfileDto } from "@tailored-cv/types";

export interface CategorizedResumeSkills {
  professional: string[];
  handsOn: string[];
  familiar: string[];
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

  const professional = selectedSkills
    .filter((s) => s.category === "PROFESSIONAL")
    .map((s) => s.name);
  const handsOn = selectedSkills
    .filter((s) => s.category === "HANDS_ON")
    .map((s) => s.name);
  const familiar = selectedSkills
    .filter((s) => s.category === "FAMILIAR")
    .map((s) => s.name);

  return {
    professional,
    handsOn,
    familiar,
  };
}

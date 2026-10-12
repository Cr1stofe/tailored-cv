import * as fs from "node:fs";
import * as path from "node:path";
import type {
  TailorResumeInput,
  TailoredExperienceItem,
  TailoredProjectItem,
} from "@tailored-cv/types";
import { GeminiProvider } from "../providers/gemini.provider";
import { tailoringFixtures } from "./tailoring.test-fixtures";

const envPath = path.resolve(process.cwd(), "../../.env");
if (fs.existsSync(envPath)) process.loadEnvFile(envPath);

function requiredGeminiApiKey(): string {
  const value = process.env.GEMINI_API_KEY;
  if (!value) {
    throw new Error(
      "GEMINI_API_KEY é necessária para gerar as fixtures reais.",
    );
  }
  return value;
}

const apiKey = requiredGeminiApiKey();

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function printDiff(
  fixture: TailorResumeInput,
  headline: string | null | undefined,
  summary: string,
  skills: string[],
  experiences: TailoredExperienceItem[],
  projects: TailoredProjectItem[] | null | undefined,
): void {
  const lines: string[] = [];
  const selectedBullets = experiences.flatMap((experience) =>
    experience.reframedHighlights.map(normalize),
  );
  const selectedProjects = new Set(
    (projects || []).map((project) => normalize(project.name)),
  );

  lines.push(
    `\n## ${fixture.company} — ${fixture.position}`,
    `### Cabeçalho\n${headline || "—"}`,
    `### Resumo\n${summary}`,
    `### Competências\n${skills.join(", ")}`,
    "### Experiência",
  );
  for (const bullet of fixture.masterProfile.experiences.flatMap(
    (experience) => experience.highlights,
  )) {
    lines.push(
      `${selectedBullets.some((selected) => selected.includes(normalize(bullet))) ? "+" : "-"} ${bullet}`,
    );
  }
  for (const experience of experiences) {
    lines.push(
      `  Tecnologias (${experience.company}): ${experience.technologies.join(", ")}`,
    );
  }
  lines.push("### Projetos");
  for (const project of fixture.masterProfile.projects) {
    lines.push(
      `${selectedProjects.has(normalize(project.name)) ? "+" : "-"} ${project.name}`,
    );
  }
  for (const project of projects || []) {
    lines.push(
      `  ${project.name}: ${project.url || "sem link"} | ${project.technologies.join(", ")}`,
    );
  }
  process.stdout.write(`${lines.join("\n")}\n`);
}

async function main(): Promise<void> {
  const provider = new GeminiProvider(
    apiKey,
    process.env.GEMINI_MODEL || "gemini-flash-lite-latest",
  );

  const filter = process.argv
    .slice(2)
    .filter((argument) => argument !== "--")
    .join(" ")
    .trim()
    .toLowerCase();
  const fixtures = filter
    ? tailoringFixtures.filter((fixture) =>
        `${fixture.company} ${fixture.position}`.toLowerCase().includes(filter),
      )
    : tailoringFixtures;
  if (fixtures.length === 0) {
    throw new Error(`Nenhuma fixture encontrada para o filtro "${filter}".`);
  }

  for (const fixture of fixtures) {
    const output = await provider.tailorResume(fixture);
    printDiff(
      fixture,
      output.targetedHeadline,
      output.reframedSummary,
      output.highlightedSkills,
      output.tailoredExperiences,
      output.tailoredProjects,
    );
    process.stdout.write(
      `### Relatório\n${JSON.stringify(output.generationReport, null, 2)}\n`,
    );
  }
}

void main();

import * as fs from "node:fs";
import * as path from "node:path";
import {
  masterProfileSchema,
  type MasterProfileInput,
} from "@tailored-cv/validation";

const DEFAULT_FALLBACK_PROFILE: MasterProfileInput = {
  fullName: "Alex Silva",
  email: "alex.silva@example.com",
  phone: "(11) 98765-4321",
  location: "São Paulo, SP",
  summary: "Desenvolvedor de Software Full Stack",
  skills: [{ name: "TypeScript", category: "PROFESSIONAL" }],
  experiences: [],
  projects: [],
  educations: [],
  certifications: [],
};

export function loadSeedProfileData(): MasterProfileInput {
  const candidatePaths = [
    process.env.PROFILE_DATA_PATH,
    path.resolve(process.cwd(), "apps/api/data/profile.custom.json"),
    path.resolve(process.cwd(), "data/profile.custom.json"),
    path.resolve(__dirname, "../../../data/profile.custom.json"),
    path.resolve(__dirname, "../../data/profile.custom.json"),
    path.resolve(__dirname, "../data/profile.custom.json"),
    path.resolve(process.cwd(), "apps/api/data/profile.example.json"),
    path.resolve(process.cwd(), "data/profile.example.json"),
    path.resolve(__dirname, "../../../data/profile.example.json"),
    path.resolve(__dirname, "../../data/profile.example.json"),
    path.resolve(__dirname, "../data/profile.example.json"),
  ].filter((p): p is string => Boolean(p));

  for (const filePath of candidatePaths) {
    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, "utf-8");
        const json = JSON.parse(raw);
        const parseResult = masterProfileSchema.safeParse(json);

        if (parseResult.success) {
          return parseResult.data;
        }

        console.warn(
          `[ProfileLoader] Aviso: ${filePath} não passou na validação do schema:`,
          parseResult.error.format(),
        );
      } catch (err) {
        console.warn(`[ProfileLoader] Aviso ao ler ${filePath}:`, err);
      }
    }
  }

  return DEFAULT_FALLBACK_PROFILE;
}

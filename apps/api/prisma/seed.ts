import * as fs from "node:fs";
import * as path from "node:path";
import { PrismaClient, SkillCategory } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PasswordService } from "../src/common/security/password.service";
import { loadSeedProfileData } from "../src/profile/utils/profile-loader.util";

const envPaths = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../../.env"),
  path.resolve(__dirname, "../../../.env"),
];
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    process.loadEnvFile(p);
    break;
  }
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL não configurada no ambiente.");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const profileData = loadSeedProfileData();

  console.log(`Iniciando seed do perfil: ${profileData.fullName}...`);

  const initialEmail = process.env.INITIAL_USER_EMAIL;
  const initialPassword = process.env.INITIAL_USER_PASSWORD;
  const initialName = process.env.INITIAL_USER_NAME || profileData.fullName;
  const initialUsername = process.env.INITIAL_USER_USERNAME || "admin";

  let hashedPassword = "";
  if (initialEmail && initialPassword) {
    const passwordService = new PasswordService();
    hashedPassword = await passwordService.hash(initialPassword);
  }

  await prisma.$transaction(async (tx) => {
    await tx.profile.deleteMany();

    await tx.profile.create({
      data: {
        fullName: profileData.fullName,
        email: profileData.email,
        phone: profileData.phone,
        location: profileData.location,
        linkedinUrl: profileData.linkedinUrl || null,
        githubUrl: profileData.githubUrl || null,
        portfolioUrl: profileData.portfolioUrl || null,
        summary: profileData.summary,
        skills: {
          create: (profileData.skills || []).map((s) => ({
            name: s.name,
            category:
              (s.category as SkillCategory) || SkillCategory.PROFESSIONAL,
          })),
        },
        experiences: {
          create: (profileData.experiences || []).map((e, index) => ({
            company: e.company,
            position: e.position,
            location: e.location,
            startDate: e.startDate,
            endDate: e.endDate,
            isCurrent: e.isCurrent ?? false,
            technologies: e.technologies || [],
            highlights: e.highlights || [],
            orderIndex: e.orderIndex ?? index,
          })),
        },
        projects: {
          create: (profileData.projects || []).map((p, index) => ({
            name: p.name,
            description: p.description || "",
            url: p.url || null,
            technologies: p.technologies || [],
            highlights: p.highlights || [],
            orderIndex: p.orderIndex ?? index,
          })),
        },
        educations: {
          create: (profileData.educations || []).map((ed) => ({
            institution: ed.institution,
            degree: ed.degree,
            fieldOfStudy: ed.fieldOfStudy,
            startDate: ed.startDate,
            endDate: ed.endDate,
          })),
        },
        certifications: {
          create: (profileData.certifications || []).map((c) => ({
            name: c.name,
            issuer: c.issuer,
            issueDate: c.issueDate,
            url: c.url || null,
          })),
        },
      },
    });

    if (initialEmail && initialPassword && hashedPassword) {
      await tx.user.upsert({
        where: { email: initialEmail },
        update: {
          password: hashedPassword,
          name: initialName,
          username: initialUsername,
        },
        create: {
          email: initialEmail,
          password: hashedPassword,
          name: initialName,
          username: initialUsername,
        },
      });
    }
  });

  console.log("Perfil criado com sucesso sob transação atômica.");
  if (initialEmail && initialPassword) {
    console.log(`Usuário inicial (${initialEmail}) sincronizado com sucesso.`);
  }
}

main()
  .catch((e) => {
    console.error("Erro durante execução do seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

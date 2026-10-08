import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { MasterProfileDto } from "@tailored-cv/types";
import { Prisma, SkillCategory } from "@prisma/client";
import { AIService } from "../ai/ai.service";
import { loadSeedProfileData } from "./utils/profile-loader.util";
import type { MasterProfileInput } from "@tailored-cv/validation";

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
  ) {}

  async getProfile(): Promise<MasterProfileDto> {
    const profile = await this.prisma.profile.findFirst({
      include: {
        skills: { orderBy: [{ category: "asc" }, { name: "asc" }] },
        experiences: { orderBy: { orderIndex: "asc" } },
        projects: { orderBy: { orderIndex: "asc" } },
        educations: true,
        certifications: true,
      },
    });

    if (!profile) {
      this.logger.log("No profile found. Seeding default Master Profile...");
      return this.seedDefaultProfile();
    }

    return {
      id: profile.id,
      fullName: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      location: profile.location,
      linkedinUrl: profile.linkedinUrl,
      githubUrl: profile.githubUrl,
      portfolioUrl: profile.portfolioUrl,
      summary: profile.summary,
      skills: profile.skills.map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category as "PROFESSIONAL" | "HANDS_ON" | "FAMILIAR",
      })),
      experiences: profile.experiences.map((e) => ({
        id: e.id,
        company: e.company,
        position: e.position,
        location: e.location,
        startDate: e.startDate,
        endDate: e.endDate,
        isCurrent: e.isCurrent,
        highlights: e.highlights,
        technologies: e.technologies,
        orderIndex: e.orderIndex,
      })),
      projects: profile.projects.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        url: p.url,
        highlights: p.highlights,
        technologies: p.technologies,
        orderIndex: p.orderIndex,
      })),
      educations: profile.educations.map((ed) => ({
        id: ed.id,
        institution: ed.institution,
        degree: ed.degree,
        fieldOfStudy: ed.fieldOfStudy,
        startDate: ed.startDate,
        endDate: ed.endDate,
      })),
      certifications: profile.certifications.map((c) => ({
        id: c.id,
        name: c.name,
        issuer: c.issuer,
        issueDate: c.issueDate,
        url: c.url,
      })),
      englishCv: (profile.englishCv as unknown as MasterProfileDto) || null,
      englishCvUpdatedAt: profile.englishCvUpdatedAt?.toISOString() ?? null,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    };
  }

  async updateProfile(
    data: MasterProfileDto | MasterProfileInput,
  ): Promise<MasterProfileDto> {
    const existing = await this.prisma.profile.findFirst();

    const profileId = existing?.id;

    if (!profileId) {
      await this.seedDefaultProfile();
      return this.updateProfile(data);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.profile.update({
        where: { id: profileId },
        data: {
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          location: data.location,
          linkedinUrl: data.linkedinUrl,
          githubUrl: data.githubUrl,
          portfolioUrl: data.portfolioUrl,
          summary: data.summary,
        },
      });

      await tx.skill.deleteMany({ where: { profileId } });
      if (data.skills?.length) {
        await tx.skill.createMany({
          data: data.skills.map((s) => ({
            profileId,
            name: s.name,
            category:
              (s.category as SkillCategory) || SkillCategory.PROFESSIONAL,
          })),
        });
      }

      await tx.experience.deleteMany({ where: { profileId } });
      if (data.experiences?.length) {
        await tx.experience.createMany({
          data: data.experiences.map((e, index) => ({
            profileId,
            company: e.company,
            position: e.position,
            location: e.location,
            startDate: e.startDate,
            endDate: e.endDate,
            isCurrent: e.isCurrent,
            highlights: e.highlights,
            technologies: e.technologies,
            orderIndex: e.orderIndex ?? index,
          })),
        });
      }

      await tx.project.deleteMany({ where: { profileId } });
      if (data.projects?.length) {
        await tx.project.createMany({
          data: data.projects.map((p, index) => ({
            profileId,
            name: p.name,
            description: p.description,
            url: p.url,
            highlights: p.highlights,
            technologies: p.technologies,
            orderIndex: p.orderIndex ?? index,
          })),
        });
      }

      await tx.education.deleteMany({ where: { profileId } });
      if (data.educations?.length) {
        await tx.education.createMany({
          data: data.educations.map((ed) => ({
            profileId,
            institution: ed.institution,
            degree: ed.degree,
            fieldOfStudy: ed.fieldOfStudy,
            startDate: ed.startDate,
            endDate: ed.endDate,
          })),
        });
      }

      await tx.certification.deleteMany({ where: { profileId } });
      if (data.certifications?.length) {
        await tx.certification.createMany({
          data: data.certifications.map((c) => ({
            profileId,
            name: c.name,
            issuer: c.issuer,
            issueDate: c.issueDate,
            url: c.url,
          })),
        });
      }
    });

    return this.getProfile();
  }

  async seedDefaultProfile(): Promise<MasterProfileDto> {
    const data = loadSeedProfileData();
    const existing = await this.prisma.profile.findFirst();

    if (existing) {
      return this.updateProfile(data);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.profile.create({
        data: {
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          location: data.location,
          linkedinUrl: data.linkedinUrl || null,
          githubUrl: data.githubUrl || null,
          portfolioUrl: data.portfolioUrl || null,
          summary: data.summary,
          skills: {
            create: (data.skills || []).map((s) => ({
              name: s.name,
              category:
                (s.category as SkillCategory) || SkillCategory.PROFESSIONAL,
            })),
          },
          experiences: {
            create: (data.experiences || []).map((e, index) => ({
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
            create: (data.projects || []).map((p, index) => ({
              name: p.name,
              description: p.description,
              url: p.url || null,
              technologies: p.technologies || [],
              highlights: p.highlights || [],
              orderIndex: p.orderIndex ?? index,
            })),
          },
          educations: {
            create: (data.educations || []).map((ed) => ({
              institution: ed.institution,
              degree: ed.degree,
              fieldOfStudy: ed.fieldOfStudy,
              startDate: ed.startDate,
              endDate: ed.endDate,
            })),
          },
          certifications: {
            create: (data.certifications || []).map((c) => ({
              name: c.name,
              issuer: c.issuer,
              issueDate: c.issueDate,
              url: c.url || null,
            })),
          },
        },
      });
    });

    return this.getProfile();
  }

  async generateEnglishProfile(): Promise<MasterProfileDto> {
    const currentProfile = await this.getProfile();
    this.logger.log(
      `Generating/updating English CV for profile ${currentProfile.id}...`,
    );

    const translated =
      await this.aiService.translateProfileToEnglish(currentProfile);

    await this.prisma.profile.update({
      where: { id: currentProfile.id },
      data: {
        englishCv: translated as unknown as Prisma.InputJsonValue,
        englishCvUpdatedAt: new Date(),
      },
    });

    return this.getProfile();
  }

  async getEnglishProfile(): Promise<{
    englishCv: MasterProfileDto | null;
    englishCvUpdatedAt: string | null;
  }> {
    const profile = await this.getProfile();
    return {
      englishCv: profile.englishCv ?? null,
      englishCvUpdatedAt: profile.englishCvUpdatedAt ?? null,
    };
  }
}


import { Body, Controller, Get, Post, Put } from "@nestjs/common";
import { ProfileService } from "./profile.service";
import type { MasterProfileDto } from "@tailored-cv/types";
import { masterProfileSchema } from "@tailored-cv/validation";
import { ZodValidationPipe } from "../common/pipes";
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

@Controller("profile")
@ApiTags("Profile")
@ApiCookieAuth("sessionCookie")
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOperation({ summary: "Get the master profile" })
  async getProfile(): Promise<MasterProfileDto> {
    return this.profileService.getProfile();
  }

  @Put()
  @ApiOperation({ summary: "Update the master profile" })
  @ApiBody({
    description:
      "Complete master profile. Arrays may be empty when a section is not used.",
    schema: {
      type: "object",
      required: [
        "fullName",
        "email",
        "skills",
        "experiences",
        "projects",
        "educations",
        "certifications",
      ],
      properties: {
        fullName: { type: "string", example: "Alex Developer" },
        email: { type: "string", format: "email", example: "alex@example.com" },
        phone: { type: "string", nullable: true },
        location: {
          type: "string",
          nullable: true,
          example: "Fortaleza, Brazil",
        },
        linkedinUrl: { type: "string", format: "uri", nullable: true },
        githubUrl: { type: "string", format: "uri", nullable: true },
        portfolioUrl: { type: "string", format: "uri", nullable: true },
        summary: { type: "string", nullable: true },
        skills: { type: "array", items: { type: "object" } },
        experiences: { type: "array", items: { type: "object" } },
        projects: { type: "array", items: { type: "object" } },
        educations: { type: "array", items: { type: "object" } },
        certifications: { type: "array", items: { type: "object" } },
      },
    },
  })
  @ApiResponse({ status: 200, description: "Master profile updated." })
  @ApiResponse({ status: 400, description: "Validation error." })
  async updateProfile(
    @Body(new ZodValidationPipe(masterProfileSchema)) body: MasterProfileDto,
  ): Promise<MasterProfileDto> {
    return this.profileService.updateProfile(body);
  }

  @Post("reset-seed")
  @ApiOperation({ summary: "Reset the profile to its seed data" })
  @ApiResponse({ status: 201, description: "Profile reset successfully." })
  async resetSeed(): Promise<MasterProfileDto> {
    await this.profileService.seedDefaultProfile();
    return this.profileService.getProfile();
  }

  @Post("generate-english")
  @ApiOperation({ summary: "Generate the English master profile" })
  async generateEnglish(): Promise<MasterProfileDto> {
    return this.profileService.generateEnglishProfile();
  }

  @Get("english")
  @ApiOperation({ summary: "Get the English master profile" })
  async getEnglish(): Promise<{
    englishCv: MasterProfileDto | null;
    englishCvUpdatedAt: string | null;
  }> {
    return this.profileService.getEnglishProfile();
  }
}

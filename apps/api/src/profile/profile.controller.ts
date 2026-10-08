import { Body, Controller, Get, Post, Put } from "@nestjs/common";
import { ProfileService } from "./profile.service";
import type { MasterProfileDto } from "@tailored-cv/types";

@Controller("profile")
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  async getProfile(): Promise<MasterProfileDto> {
    return this.profileService.getProfile();
  }

  @Put()
  async updateProfile(
    @Body() body: MasterProfileDto,
  ): Promise<MasterProfileDto> {
    return this.profileService.updateProfile(body);
  }

  @Post("reset-seed")
  async resetSeed(): Promise<MasterProfileDto> {
    await this.profileService.seedDefaultProfile();
    return this.profileService.getProfile();
  }

  @Post("generate-english")
  async generateEnglish(): Promise<MasterProfileDto> {
    return this.profileService.generateEnglishProfile();
  }

  @Get("english")
  async getEnglish(): Promise<{
    englishCv: MasterProfileDto | null;
    englishCvUpdatedAt: string | null;
  }> {
    return this.profileService.getEnglishProfile();
  }
}


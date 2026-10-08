import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from "@nestjs/common";
import { JobApplicationService } from "./job-application.service";
import type { CreateJobApplicationInput } from "@tailored-cv/validation";
import type {
  ApplicationStatus,
  TailoredResumeDto,
  SupportedLanguage,
} from "@tailored-cv/types";

@Controller("job-applications")
export class JobApplicationController {
  constructor(private readonly jobApplicationService: JobApplicationService) {}

  @Get()
  async findAll() {
    return this.jobApplicationService.findAll();
  }

  @Post()
  async create(@Body() body: CreateJobApplicationInput) {
    return this.jobApplicationService.create(body);
  }

  @Get(":id")
  async findById(@Param("id") id: string) {
    return this.jobApplicationService.findById(id);
  }

  @Delete(":id")
  async delete(@Param("id") id: string) {
    return this.jobApplicationService.delete(id);
  }

  @Patch(":id/status")
  async updateStatus(
    @Param("id") id: string,
    @Body("status") status: ApplicationStatus,
  ) {
    return this.jobApplicationService.updateStatus(id, status);
  }

  @Post(":id/analyze")
  async analyze(@Param("id") id: string) {
    return this.jobApplicationService.analyze(id);
  }

  @Post(":id/tailor")
  async tailor(
    @Param("id") id: string,
    @Body("targetLanguage") targetLanguage?: SupportedLanguage,
  ) {
    return this.jobApplicationService.tailor(id, { targetLanguage });
  }

  @Get(":id/tailored-resume")
  async getTailoredResume(@Param("id") id: string) {
    return this.jobApplicationService.getTailoredResume(id);
  }

  @Put(":id/tailored-resume")
  async updateTailoredResume(
    @Param("id") id: string,
    @Body() body: Partial<TailoredResumeDto>,
  ) {
    return this.jobApplicationService.updateTailoredResume(id, body);
  }
}

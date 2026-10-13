import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  ParseUUIDPipe,
} from "@nestjs/common";
import { JobApplicationService } from "./job-application.service";
import type { CreateJobApplicationInput } from "@tailored-cv/validation";
import type {
  ApplicationStatus,
  TailoredResumeDto,
  SupportedLanguage,
  JobApplicationFiltersDto,
  TailoringGenerationDto,
} from "@tailored-cv/types";
import {
  createJobApplicationSchema,
  tailorResumeRequestSchema,
  tailoredResumeFormSchema,
  updateJobApplicationStatusSchema,
  tailoringStatusQuerySchema,
} from "@tailored-cv/validation";
import { ZodValidationPipe } from "../common/pipes";

@Controller("job-applications")
export class JobApplicationController {
  constructor(private readonly jobApplicationService: JobApplicationService) {}

  @Get()
  async findAll(@Query() query: JobApplicationFiltersDto) {
    return this.jobApplicationService.findAll(query);
  }

  @Post()
  async create(
    @Body(new ZodValidationPipe(createJobApplicationSchema))
    body: CreateJobApplicationInput,
  ) {
    return this.jobApplicationService.create(body);
  }

  @Get(":id")
  async findById(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.jobApplicationService.findById(id);
  }

  @Delete(":id")
  async delete(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.jobApplicationService.delete(id);
  }

  @Patch(":id/status")
  async updateStatus(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateJobApplicationStatusSchema))
    body: { status: ApplicationStatus },
  ) {
    return this.jobApplicationService.updateStatus(id, body.status);
  }

  @Post(":id/analyze")
  async analyze(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.jobApplicationService.analyze(id);
  }

  @Post(":id/tailor")
  @HttpCode(HttpStatus.ACCEPTED)
  async tailor(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(tailorResumeRequestSchema))
    body: { targetLanguage?: SupportedLanguage },
  ): Promise<TailoringGenerationDto> {
    return this.jobApplicationService.tailor(id, {
      targetLanguage: body.targetLanguage,
    });
  }

  @Get(":id/tailor/status")
  async getTailoringStatus(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Query(new ZodValidationPipe(tailoringStatusQuerySchema))
    query: { language?: SupportedLanguage },
  ): Promise<TailoringGenerationDto> {
    return this.jobApplicationService.getTailoringStatus(id, query.language);
  }

  @Get(":id/tailored-resume")
  async getTailoredResume(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.jobApplicationService.getTailoredResume(id);
  }

  @Put(":id/tailored-resume")
  async updateTailoredResume(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(tailoredResumeFormSchema.partial()))
    body: Partial<TailoredResumeDto> & { resumeId?: string },
  ) {
    return this.jobApplicationService.updateTailoredResume(id, body);
  }
}

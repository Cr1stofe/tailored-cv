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
  AnalysisGenerationDto,
} from "@tailored-cv/types";
import {
  createJobApplicationSchema,
  tailorResumeRequestSchema,
  tailoredResumeFormSchema,
  updateJobApplicationStatusSchema,
  tailoringStatusQuerySchema,
} from "@tailored-cv/validation";
import { ZodValidationPipe } from "../common/pipes";
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

@Controller("job-applications")
@ApiTags("Job applications")
@ApiCookieAuth("sessionCookie")
export class JobApplicationController {
  constructor(private readonly jobApplicationService: JobApplicationService) {}

  @Get()
  @ApiOperation({ summary: "List job applications" })
  @ApiQuery({ name: "page", required: false, type: Number, example: 1 })
  @ApiQuery({ name: "limit", required: false, type: Number, example: 12 })
  @ApiQuery({
    name: "search",
    required: false,
    type: String,
    description: "Search company, position, location, or job description.",
  })
  @ApiQuery({
    name: "status",
    required: false,
    enum: ["DRAFT", "ANALYZED", "TAILORED"],
  })
  @ApiQuery({
    name: "stack",
    required: false,
    type: String,
    description:
      "Stack category filter, such as FULLSTACK, FRONTEND, BACKEND, MOBILE, or DEVOPS.",
  })
  @ApiQuery({
    name: "sortBy",
    required: false,
    enum: ["newest", "oldest", "match_desc", "match_asc", "company_asc"],
  })
  async findAll(@Query() query: JobApplicationFiltersDto) {
    return this.jobApplicationService.findAll(query);
  }

  @Post()
  @ApiOperation({ summary: "Create a job application" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["company", "position", "jobDescription", "targetLanguage"],
      properties: {
        company: { type: "string", example: "Acme Inc." },
        position: { type: "string", example: "Frontend Developer" },
        location: { type: "string", nullable: true, example: "Remote" },
        url: { type: "string", format: "uri", nullable: true },
        jobDescription: {
          type: "string",
          minLength: 20,
          example:
            "We are looking for a frontend developer with React and TypeScript experience.",
        },
        targetLanguage: { type: "string", enum: ["PT", "EN"], example: "EN" },
      },
    },
  })
  @ApiResponse({ status: 201, description: "Job application created." })
  @ApiResponse({ status: 400, description: "Validation error." })
  async create(
    @Body(new ZodValidationPipe(createJobApplicationSchema))
    body: CreateJobApplicationInput,
  ) {
    return this.jobApplicationService.create(body);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a job application" })
  async findById(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.jobApplicationService.findById(id);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a job application" })
  async delete(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.jobApplicationService.delete(id);
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "Update a job application status" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["status"],
      properties: {
        status: { type: "string", enum: ["DRAFT", "ANALYZED", "TAILORED"] },
      },
    },
  })
  async updateStatus(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateJobApplicationStatusSchema))
    body: { status: ApplicationStatus },
  ) {
    return this.jobApplicationService.updateStatus(id, body.status);
  }

  @Post(":id/analyze")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Queue job analysis" })
  @ApiResponse({ status: 202, description: "Analysis queued for processing." })
  @ApiResponse({
    status: 409,
    description: "Another analysis or tailoring job is active.",
  })
  async analyze(
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<AnalysisGenerationDto> {
    return this.jobApplicationService.analyze(id);
  }

  @Get(":id/analyze/status")
  @ApiOperation({ summary: "Get job analysis generation status" })
  async getAnalysisStatus(
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<AnalysisGenerationDto> {
    return this.jobApplicationService.getAnalysisStatus(id);
  }

  @Post(":id/tailor")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Queue tailored resume generation" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        targetLanguage: { type: "string", enum: ["PT", "EN"], example: "EN" },
      },
    },
  })
  @ApiResponse({
    status: 202,
    description: "Tailored resume generation queued.",
  })
  @ApiResponse({
    status: 409,
    description: "Another analysis or tailoring job is active.",
  })
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
  @ApiOperation({ summary: "Get tailored resume generation status" })
  @ApiQuery({
    name: "language",
    required: false,
    enum: ["PT", "EN"],
    description: "Target language of the generation to inspect.",
  })
  async getTailoringStatus(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Query(new ZodValidationPipe(tailoringStatusQuerySchema))
    query: { language?: SupportedLanguage },
  ): Promise<TailoringGenerationDto> {
    return this.jobApplicationService.getTailoringStatus(id, query.language);
  }

  @Get(":id/tailored-resume")
  @ApiOperation({ summary: "Get the tailored resume" })
  async getTailoredResume(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.jobApplicationService.getTailoredResume(id);
  }

  @Put(":id/tailored-resume")
  @ApiOperation({ summary: "Update the tailored resume" })
  @ApiBody({
    description:
      "Any editable tailored-resume fields. Omitted fields are preserved.",
    schema: {
      type: "object",
      properties: {
        resumeId: { type: "string", format: "uuid" },
        title: { type: "string", example: "Frontend Developer" },
        targetedHeadline: { type: "string", nullable: true },
        reframedSummary: { type: "string" },
        highlightedSkills: { type: "array", items: { type: "string" } },
        tailoredExperiences: { type: "array", items: { type: "object" } },
        tailoredProjects: {
          type: "array",
          items: { type: "object" },
          nullable: true,
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: "Tailored resume updated." })
  @ApiResponse({ status: 404, description: "Tailored resume not found." })
  async updateTailoredResume(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(tailoredResumeFormSchema.partial()))
    body: Partial<TailoredResumeDto> & { resumeId?: string },
  ) {
    return this.jobApplicationService.updateTailoredResume(id, body);
  }
}

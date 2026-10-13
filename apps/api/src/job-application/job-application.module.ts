import { Module } from "@nestjs/common";
import { JobApplicationController } from "./job-application.controller";
import { JobApplicationService } from "./job-application.service";
import { ProfileModule } from "../profile/profile.module";
import { AIModule } from "../ai/ai.module";
import { TailoringGenerationService } from "./tailoring-generation.service";
import { AnalysisGenerationService } from "./analysis-generation.service";

@Module({
  imports: [ProfileModule, AIModule],
  controllers: [JobApplicationController],
  providers: [
    JobApplicationService,
    TailoringGenerationService,
    AnalysisGenerationService,
  ],
  exports: [JobApplicationService],
})
export class JobApplicationModule {}

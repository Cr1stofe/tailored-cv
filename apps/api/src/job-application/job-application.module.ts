import { Module } from "@nestjs/common";
import { JobApplicationController } from "./job-application.controller";
import { JobApplicationService } from "./job-application.service";
import { ProfileModule } from "../profile/profile.module";
import { AIModule } from "../ai/ai.module";
import { TailoringGenerationService } from "./tailoring-generation.service";

@Module({
  imports: [ProfileModule, AIModule],
  controllers: [JobApplicationController],
  providers: [JobApplicationService, TailoringGenerationService],
  exports: [JobApplicationService],
})
export class JobApplicationModule {}

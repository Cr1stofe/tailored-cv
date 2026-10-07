import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";
import { AIModule } from "../ai/ai.module";

@Module({
  imports: [AIModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}

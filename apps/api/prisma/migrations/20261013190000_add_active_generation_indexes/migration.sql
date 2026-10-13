CREATE UNIQUE INDEX "analysis_generations_one_active_per_application_idx"
  ON "analysis_generations"("application_id")
  WHERE "status" IN ('QUEUED', 'PROCESSING');

CREATE UNIQUE INDEX "tailoring_generations_one_active_per_language_idx"
  ON "tailoring_generations"("application_id", "target_language")
  WHERE "status" IN ('QUEUED', 'PROCESSING');

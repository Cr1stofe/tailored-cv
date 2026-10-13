CREATE TYPE "AnalysisGenerationStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE "analysis_generations" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "status" "AnalysisGenerationStatus" NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "analysis_id" TEXT,
    "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analysis_generations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "analysis_generations_application_id_created_at_idx"
  ON "analysis_generations"("application_id", "created_at");

CREATE INDEX "analysis_generations_status_available_at_created_at_idx"
  ON "analysis_generations"("status", "available_at", "created_at");

ALTER TABLE "analysis_generations"
  ADD CONSTRAINT "analysis_generations_application_id_fkey"
  FOREIGN KEY ("application_id") REFERENCES "job_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "analysis_generations"
  ADD CONSTRAINT "analysis_generations_analysis_id_fkey"
  FOREIGN KEY ("analysis_id") REFERENCES "job_analyses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

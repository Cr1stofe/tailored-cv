CREATE TYPE "TailoringGenerationStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE "tailoring_generations" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "target_language" TEXT NOT NULL DEFAULT 'PT',
    "status" "TailoringGenerationStatus" NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "resume_id" TEXT,
    "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tailoring_generations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tailoring_generations_application_id_target_language_created_at_idx"
  ON "tailoring_generations"("application_id", "target_language", "created_at");

CREATE INDEX "tailoring_generations_status_available_at_created_at_idx"
  ON "tailoring_generations"("status", "available_at", "created_at");

ALTER TABLE "tailoring_generations"
  ADD CONSTRAINT "tailoring_generations_application_id_fkey"
  FOREIGN KEY ("application_id") REFERENCES "job_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

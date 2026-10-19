CREATE TYPE "CoverLetterGenerationStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE "cover_letter_generations" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "target_language" TEXT NOT NULL DEFAULT 'PT',
    "focus" TEXT NOT NULL DEFAULT 'frontend',
    "status" "CoverLetterGenerationStatus" NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "content" TEXT,
    "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cover_letter_generations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "cover_letter_generations_application_id_target_language_focus_created_at_idx"
  ON "cover_letter_generations"("application_id", "target_language", "focus", "created_at");

CREATE INDEX "cover_letter_generations_status_available_at_created_at_idx"
  ON "cover_letter_generations"("status", "available_at", "created_at");

ALTER TABLE "cover_letter_generations"
  ADD CONSTRAINT "cover_letter_generations_application_id_fkey"
  FOREIGN KEY ("application_id") REFERENCES "job_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "job_applications" ADD COLUMN     "target_language" TEXT NOT NULL DEFAULT 'PT';

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "english_cv" JSONB,
ADD COLUMN     "english_cv_updated_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tailored_resumes" ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'PT';

CREATE TYPE "processing_job_status" AS ENUM ('pending', 'running', 'completed', 'failed');

CREATE TABLE "paper_processing_jobs" (
    "id" TEXT NOT NULL,
    "paper_id" TEXT NOT NULL,
    "status" "processing_job_status" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "claimed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "paper_processing_jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "paper_processing_jobs_paper_id_key"
  ON "paper_processing_jobs"("paper_id");
CREATE INDEX "paper_processing_jobs_status_claimed_at_idx"
  ON "paper_processing_jobs"("status", "claimed_at");

ALTER TABLE "paper_processing_jobs"
  ADD CONSTRAINT "paper_processing_jobs_paper_id_fkey"
  FOREIGN KEY ("paper_id") REFERENCES "papers"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

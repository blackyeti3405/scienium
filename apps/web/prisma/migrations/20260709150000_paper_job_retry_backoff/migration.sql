-- Phase 5: retryable paper processing with backoff + terminal state.
ALTER TABLE "paper_processing_jobs"
  ADD COLUMN "next_run_at" TIMESTAMP(3),
  ADD COLUMN "terminal_at" TIMESTAMP(3);

DROP INDEX "paper_processing_jobs_status_claimed_at_idx";
CREATE INDEX "paper_processing_jobs_status_next_run_at_claimed_at_idx"
  ON "paper_processing_jobs"("status", "next_run_at", "claimed_at");

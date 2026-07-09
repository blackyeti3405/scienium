-- Phase 3: make expertise grading claim-based and idempotent.
CREATE TYPE "expertise_exam_status" AS ENUM ('active', 'grading', 'graded', 'failed');

ALTER TABLE "expertise_exams"
  ADD COLUMN "status" "expertise_exam_status" NOT NULL DEFAULT 'active',
  ADD COLUMN "grading_claimed_at" TIMESTAMP(3),
  ADD COLUMN "grading_request_id" TEXT;

-- Existing rows that already carry a grade are graded, not active.
UPDATE "expertise_exams" SET "status" = 'graded' WHERE "graded_at" IS NOT NULL;

CREATE INDEX "expertise_exams_team_id_user_id_status_created_at_idx"
  ON "expertise_exams"("team_id", "user_id", "status", "created_at");

-- Resumable clearance exams: persist in-progress answers + progress so an
-- ungraded exam can be picked up where it was left off instead of regenerated.
ALTER TABLE "expertise_exams" ADD COLUMN IF NOT EXISTS "answers_json" JSONB;
ALTER TABLE "expertise_exams" ADD COLUMN IF NOT EXISTS "progress_index" INTEGER NOT NULL DEFAULT 0;

-- Catch-up migration: these columns were applied to dev via `prisma db push`
-- (lab-type auto-assignment + the Operations Hub project/failure logs) but never
-- captured as a migration. Written idempotently so it applies cleanly to an
-- existing production DB regardless of partial prior state.

-- teams.research_idea — one-sentence idea used for Haiku lab-type classification
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "research_idea" TEXT;

-- project_logs: structured project-log fields + shared-edit attribution
ALTER TABLE "project_logs" ADD COLUMN IF NOT EXISTS "next_steps" TEXT NOT NULL DEFAULT '';
ALTER TABLE "project_logs" ADD COLUMN IF NOT EXISTS "attendee_ids" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "project_logs" ADD COLUMN IF NOT EXISTS "attachment_urls" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "project_logs" ADD COLUMN IF NOT EXISTS "last_edited_by_user_id" TEXT;
ALTER TABLE "project_logs" ADD COLUMN IF NOT EXISTS "last_edited_at" TIMESTAMP(3);

-- FK for the last editor (no IF NOT EXISTS for constraints — guard with a DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'project_logs_last_edited_by_user_id_fkey'
  ) THEN
    ALTER TABLE "project_logs"
      ADD CONSTRAINT "project_logs_last_edited_by_user_id_fkey"
      FOREIGN KEY ("last_edited_by_user_id") REFERENCES "users"("id")
      ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

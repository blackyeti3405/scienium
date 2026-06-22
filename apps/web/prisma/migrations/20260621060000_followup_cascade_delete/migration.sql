-- Fix FK cascade: project_log_followups must be deleted when the parent ProjectLog is deleted.
-- Prisma's default (no onDelete) maps to RESTRICT/NoAction, causing P2003 when deleting a
-- failure entry that has a follow-up. Re-create the FK with ON DELETE CASCADE.

ALTER TABLE "project_log_followups"
  DROP CONSTRAINT "project_log_followups_project_log_id_fkey";

ALTER TABLE "project_log_followups"
  ADD CONSTRAINT "project_log_followups_project_log_id_fkey"
  FOREIGN KEY ("project_log_id")
  REFERENCES "project_logs"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

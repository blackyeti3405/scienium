DROP INDEX IF EXISTS "codex_lesson_progress_user_id_track_slug_idx";
ALTER TABLE "codex_lesson_progress" DROP CONSTRAINT "codex_lesson_progress_pkey";
ALTER TABLE "codex_lesson_progress"
  ADD CONSTRAINT "codex_lesson_progress_pkey"
  PRIMARY KEY ("user_id", "team_id", "track_slug", "lesson_id");
CREATE INDEX "codex_lesson_progress_user_id_team_id_track_slug_idx"
  ON "codex_lesson_progress"("user_id", "team_id", "track_slug");

DROP INDEX "codex_kp_days_user_id_day_key";
CREATE UNIQUE INDEX "codex_kp_days_user_id_team_id_day_key"
  ON "codex_kp_days"("user_id", "team_id", "day");

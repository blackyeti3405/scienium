-- REFACTOR2 P2-S14: record when a team ENTERED its current phase.
--
-- Teacher phase pacing ("days in current phase") was computed from
-- `teams.created_at`, which is the team's AGE — a lab that advanced this morning
-- read as however old the lab was. There is no phase history to reconstruct
-- from, so existing rows are backfilled to `created_at`: that reproduces exactly
-- the number the report showed before this migration, and every transition from
-- now on stamps the real value.
--
-- Nullable (no unique index, so the dedupe policy does not apply): the column
-- defaults to now() for new teams, and readers fall back to `created_at`.
ALTER TABLE "teams" ADD COLUMN "phase_entered_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

UPDATE "teams" SET "phase_entered_at" = "created_at";

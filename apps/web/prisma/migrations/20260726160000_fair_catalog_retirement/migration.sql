-- REFACTOR2 P1-R16 (fairs half): the seeder returned early on row count, so a
-- same-size dataset correction was suppressed entirely — and a key REMOVED from
-- the authored edition stayed in the database forever, still matching students
-- to a fair that no longer exists.
--
-- Retire rather than delete: `fair_events`, `team_fair_interests`, and
-- notifications hold FKs into `fairs`, and a retired fair is still the true
-- history of a team that entered it. Matching filters on this column instead.
ALTER TABLE "fairs" ADD COLUMN "retired_at" TIMESTAMP(3);

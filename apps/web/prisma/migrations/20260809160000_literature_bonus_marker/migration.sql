-- One-time 25-source literature bonus marker.
--
-- Nullable and unset for every existing team: they were all just returned to
-- `discovery`, so none has earned it yet. A team that later reaches 25 sources
-- with every member proficient gets paid once, and the timestamp is what stops
-- a second payment.
ALTER TABLE "teams" ADD COLUMN "literature_bonus_at" TIMESTAMP(3);

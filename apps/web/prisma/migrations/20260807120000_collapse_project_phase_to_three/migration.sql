-- ProjectPhase collapses from six values to three (v0.80.0).
--
-- The arc a student walks is "explore → read → build", and each of the three
-- surviving phases is entered by a real action: locking a final topic, then
-- entering a research idea. The three retired values were never events —
-- `lab_selection` and `research_planning` were passed through automatically and
-- `showcase` only ever gated the Showcase gateway.
--
-- Mapping (nothing is lost; every team lands on the phase whose unlocks it
-- already had):
--   discovery          → discovery
--   lab_selection      → discovery          (never picked a type; picks one at sign-up now)
--   literature_review  → literature_review
--   research_planning  → working
--   working            → working
--   showcase           → working            (Showcase is now a `working` unlock)
--
-- `teams.phase` is the only column on this type. The default must be dropped
-- before the cast — Postgres will not re-parse a default against a new type —
-- and is restored at the end.

ALTER TABLE "teams" ALTER COLUMN "phase" DROP DEFAULT;

CREATE TYPE "project_phase_new" AS ENUM ('discovery', 'literature_review', 'working');

ALTER TABLE "teams"
  ALTER COLUMN "phase" TYPE "project_phase_new"
  USING (
    CASE "phase"::text
      WHEN 'lab_selection' THEN 'discovery'
      WHEN 'research_planning' THEN 'working'
      WHEN 'showcase' THEN 'working'
      ELSE "phase"::text
    END
  )::"project_phase_new";

DROP TYPE "project_phase";
ALTER TYPE "project_phase_new" RENAME TO "project_phase";

ALTER TABLE "teams" ALTER COLUMN "phase" SET DEFAULT 'discovery'::"project_phase";

-- ProjectPhase goes from three values to four.
--
-- `working` was entered by one action (entering a research idea) but unlocked
-- two very different tiers at once: the Research Plan, AND the rest of the
-- Operations Hub plus the Showcase. Splitting it puts a real milestone between
-- them, so the late-game surfaces are earned rather than handed over wholesale.
--
-- Mapping (nothing is lost; every team keeps the unlocks it already had):
--   discovery          → discovery
--   literature_review  → literature_review
--   working            → plan_refinement      (same entry trigger: the research idea)
--
-- `plan_refinement` deliberately grants LESS than the old `working` did — the
-- Operations Hub's earned half, the Data Terminal and the Showcase now sit
-- behind `project_development` (20 fully-proficient sources). No existing team
-- silently loses access to those, because the follow-up reset migration returns
-- every team to `discovery` anyway; this file only has to preserve the enum.
--
-- Enum values are replaced by create-cast-drop rather than ALTER TYPE ... ADD
-- VALUE: it keeps the declared ORDER of the values exact (the app derives phase
-- ordering from it), and ADD VALUE cannot be used later in the same transaction
-- as the value it adds.
--
-- `teams.phase` is the only column on this type. The default must be dropped
-- before the cast — Postgres will not re-parse a default against a new type —
-- and is restored at the end.

ALTER TABLE "teams" ALTER COLUMN "phase" DROP DEFAULT;

CREATE TYPE "project_phase_new" AS ENUM (
  'discovery',
  'literature_review',
  'plan_refinement',
  'project_development'
);

ALTER TABLE "teams"
  ALTER COLUMN "phase" TYPE "project_phase_new"
  USING (
    CASE "phase"::text
      WHEN 'working' THEN 'plan_refinement'
      ELSE "phase"::text
    END
  )::"project_phase_new";

DROP TYPE "project_phase";
ALTER TYPE "project_phase_new" RENAME TO "project_phase";

ALTER TABLE "teams" ALTER COLUMN "phase" SET DEFAULT 'discovery'::"project_phase";

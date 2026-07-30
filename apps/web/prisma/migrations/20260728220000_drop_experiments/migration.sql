-- Data Terminal revamp — drop the retired `experiments`/`measurements` pair.
--
-- The Experiment + Measurement models are replaced entirely by `Dataset`
-- (added in 20260728210000_data_terminal_datasets). Two data homes would be the
-- exact patchwork the house rules forbid. See
-- docs/architecture/data-terminal-revamp-plan.md §1.
--
-- BACKFILL-FIRST IS ENFORCED, NOT JUST DOCUMENTED: the guard below aborts this
-- migration if any experiment still lacks its converted dataset — matched by the
-- `backfill:exp:<id>` marker `scripts/backfill-datasets-from-experiments.mjs`
-- writes into `datasets.source_filename`. So `prisma migrate deploy` can never
-- drop these tables before the backfill has converted every experiment into a
-- 4-column XY dataset; once dropped there is nothing left to convert. On a
-- re-apply the `experiments` table is already gone and the guard is skipped.
--
-- `measurements` is dropped BEFORE `experiments`: `measurements.experiment_id`
-- carries the only foreign key between the two, so the child goes first. Both
-- use `IF EXISTS` so the migration is a no-op on a database the backfill already
-- cleared or that never had them.
--
-- P1-S14 preflight: NONE IS NEEDED. This migration only DROPS tables; it adds
-- no constraint to existing rows, so there is no historical duplicate a
-- preflight would have to clear.

-- Guard: refuse to drop while any experiment has not been backfilled yet.
-- Wrapped in a to_regclass check so a second deploy (table already gone) is a
-- no-op rather than an error.
DO $$
BEGIN
  IF to_regclass('public.experiments') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM "experiments" e
      WHERE NOT EXISTS (
        SELECT 1 FROM "datasets" d WHERE d.source_filename = 'backfill:exp:' || e.id
      )
    ) THEN
      RAISE EXCEPTION 'Refusing to drop experiments: % experiment(s) not yet backfilled. Run scripts/backfill-datasets-from-experiments.mjs first.',
        (SELECT count(*) FROM "experiments" e WHERE NOT EXISTS (SELECT 1 FROM "datasets" d WHERE d.source_filename = 'backfill:exp:' || e.id));
    END IF;
  END IF;
END $$;

-- DropTable
DROP TABLE IF EXISTS "measurements";

-- DropTable
DROP TABLE IF EXISTS "experiments";

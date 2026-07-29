-- Data Terminal revamp, phase C — Code-lane scripts on `datasets`.
--
-- One nullable JSONB column holding CodeScriptSpec[] (`{ id, name, code }`, see
-- lib/data-terminal/dataset-schema.ts). Scripts run entirely client-side in a
-- Pyodide Web Worker; nothing ever queries inside them, so — exactly like
-- `columns`/`rows`/`charts` — they live as JSONB rather than a child table.
--
-- Strictly additive: NULL for every existing row, no default, no backfill. A
-- dataset with no scripts reads `null` and the editor treats it as an empty
-- array. No preflight needed — this adds one nullable column and no constraint.

-- AlterTable
ALTER TABLE "datasets" ADD COLUMN "scripts" JSONB;

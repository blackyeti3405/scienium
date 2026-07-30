-- Data Terminal revamp, phase B — Sheets-mode chart specs on `datasets`.
--
-- One nullable JSONB column holding SheetsChartSpec[] (see
-- lib/data-terminal/sheets-chart.ts). Charts are built and drawn entirely
-- client-side with recharts; nothing ever queries inside them, so — exactly
-- like `columns`/`rows` — they live as JSONB rather than a child table.
--
-- Strictly additive: NULL for every existing row, no default, no backfill. A
-- dataset with no charts reads `null` and the editor treats it as an empty
-- array. No preflight needed — this adds one nullable column and no constraint.

-- AlterTable
ALTER TABLE "datasets" ADD COLUMN "charts" JSONB;

-- Data Terminal revamp, phase A — the `datasets` table.
--
-- The spine under all three Data Terminal lanes (Sheets / Lab / Code). See
-- docs/architecture/data-terminal-revamp-plan.md §1.
--
-- `columns` and `rows` are JSONB rather than a child row-per-point table
-- because nothing ever queries INSIDE the data: a dataset is fetched whole,
-- analyzed whole, and written whole. The `measurements` table this eventually
-- replaces bought indexing nobody used and cost a join on every read.
--
-- Strictly additive: `experiments` and `measurements` are untouched here. The
-- backfill that converts each experiment into a 4-column XY dataset, and the
-- migration that then drops the old pair, are separate and land only after
-- that conversion is verified against real dev data.
--
-- P1-S14 preflight: NONE IS NEEDED. This migration creates one new table and
-- one non-unique index; it adds no unique constraint to existing rows, so
-- there is no historical duplicate for a preflight to clear.

-- CreateEnum
CREATE TYPE "dataset_table_type" AS ENUM ('xy', 'column', 'grouped', 'contingency', 'nested', 'parts_of_whole', 'multiple_variables');

-- CreateTable
CREATE TABLE "datasets" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "table_type" "dataset_table_type" NOT NULL DEFAULT 'xy',
    "source_filename" TEXT,
    "columns" JSONB NOT NULL,
    "rows" JSONB NOT NULL,
    "row_count" INTEGER NOT NULL DEFAULT 0,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "datasets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "datasets_team_id_created_at_idx" ON "datasets"("team_id", "created_at");

-- AddForeignKey
ALTER TABLE "datasets" ADD CONSTRAINT "datasets_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "datasets" ADD CONSTRAINT "datasets_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

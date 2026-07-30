-- Phase: add TeamDailyTaskDay rollup table for PvP Spell Power Meter.
-- One row per team per calendar day, tracking completed daily tasks across
-- all pillars (Codex, Project Log, Failure Log, Proof of Expertise, etc.).
-- Each pillar's route calls lib/pvp/spell-power.ts incrementDailyTaskCount()
-- to atomically bump the counter when a task is completed.

CREATE TABLE "team_daily_task_days" (
  "team_id" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "tasks_completed" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "team_daily_task_days_pkey" PRIMARY KEY ("team_id", "date")
);

ALTER TABLE "team_daily_task_days"
  ADD CONSTRAINT "team_daily_task_days_team_id_fkey"
  FOREIGN KEY ("team_id") REFERENCES "teams"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

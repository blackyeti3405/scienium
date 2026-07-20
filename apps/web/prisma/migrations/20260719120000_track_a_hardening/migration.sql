-- Track A hardening (REFACTOR2 v0.29.4 audit):
--   A8  — retry-question generation claim column (one-generator election)
--   A13 — showcase views: per-visitor-per-DAY dedupe (day bucket + unique)
--   A4  — durable per-day notification run ledger

-- A8: claim stamp electing one retry-question generator under concurrency.
ALTER TABLE "paper_quiz_sessions" ADD COLUMN     "retry_gen_claimed_at" TIMESTAMP(3);

-- A13: day bucket for the documented "one view per visitor per day" contract.
-- Backfill: historical rows were LIFETIME-deduped (at most one row per
-- showcase+visitor ever), so stamping each with its viewed_at date cannot
-- collide on the new unique key. viewed_at is stored as UTC.
ALTER TABLE "showcase_views" ADD COLUMN     "day" DATE;
UPDATE "showcase_views" SET "day" = "viewed_at"::date WHERE "day" IS NULL;
ALTER TABLE "showcase_views" ALTER COLUMN "day" SET NOT NULL;

-- CreateTable (A4)
CREATE TABLE "notification_run_teams" (
    "id" TEXT NOT NULL,
    "run_day" DATE NOT NULL,
    "team_id" TEXT NOT NULL,
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_run_teams_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_run_teams_run_day_team_id_key" ON "notification_run_teams"("run_day", "team_id");

-- CreateIndex
CREATE UNIQUE INDEX "showcase_views_showcase_id_visitor_fingerprint_day_key" ON "showcase_views"("showcase_id", "visitor_fingerprint", "day");

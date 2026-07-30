-- Track A hardening (REFACTOR2 v0.29.4 audit):
--   A8  — retry-question generation claim column (one-generator election)
--   A13 — showcase views: per-visitor-per-DAY dedupe (day bucket + unique)
--   A4  — durable per-day notification run ledger

-- A8: claim stamp electing one retry-question generator under concurrency.
ALTER TABLE "paper_quiz_sessions" ADD COLUMN     "retry_gen_claimed_at" TIMESTAMP(3);

-- A13: day bucket for the documented "one view per visitor per day" contract.
--
-- REFACTOR2 P1-S14 correction. This block previously asserted that historical
-- rows were LIFETIME-deduped and therefore could not collide on the new unique
-- key. That was an assumption about the OLD code, not a property of the data:
-- the initial schema had no uniqueness at all, and the historical
-- findFirst-then-create was race-prone. One surviving duplicate pair aborts the
-- CREATE UNIQUE INDEX below and takes the whole deploy with it. Never add a
-- unique index without first removing the rows the old schema permitted.
--
-- viewed_at is stored as UTC.
ALTER TABLE "showcase_views" ADD COLUMN     "day" DATE;
UPDATE "showcase_views" SET "day" = "viewed_at"::date WHERE "day" IS NULL;
ALTER TABLE "showcase_views" ALTER COLUMN "day" SET NOT NULL;

-- Preflight dedupe. Keep the EARLIEST view of each (showcase, visitor, day) —
-- that row IS the first visit the contract counts — and drop the rest, with id
-- as the tiebreaker so the result is deterministic on identical timestamps.
-- Nothing holds an FK into showcase_views, so deleting losers is safe, and the
-- surviving counts become the per-day counts the product always documented.
DELETE FROM "showcase_views" sv
USING (
  SELECT id,
         row_number() OVER (
           PARTITION BY "showcase_id", "visitor_fingerprint", "day"
           ORDER BY "viewed_at", "id"
         ) AS rn
  FROM "showcase_views"
) ranked
WHERE sv.id = ranked.id
  AND ranked.rn > 1;

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

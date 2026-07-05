-- Dedupe fair_events before adding the (fair_id, year) unique index.
-- The old ensureFairsSeeded() loop had a findFirst+create race with no DB
-- constraint; concurrent hung requests mass-duplicated event rows (206 duplicate
-- fair-year pairs on the dev DB). Keep, per (fair_id, year): the confirmed row
-- first, then the row carrying the most date information (a sync-deadlines
-- correction produces exactly such a row), then lowest id for determinism.
-- No other table holds an FK into fair_events, so deleting losers is safe.
DELETE FROM "fair_events" fe
USING (
  SELECT id,
         row_number() OVER (
           PARTITION BY fair_id, year
           ORDER BY (status = 'confirmed') DESC,
                    ((event_date IS NOT NULL)::int
                     + (registration_deadline IS NOT NULL)::int
                     + (abstract_deadline IS NOT NULL)::int) DESC,
                    (venue IS NOT NULL) DESC,
                    id
         ) AS rn
  FROM "fair_events"
) ranked
WHERE fe.id = ranked.id
  AND ranked.rn > 1;

-- CreateIndex
CREATE UNIQUE INDEX "fair_events_fair_id_year_key" ON "fair_events"("fair_id", "year");

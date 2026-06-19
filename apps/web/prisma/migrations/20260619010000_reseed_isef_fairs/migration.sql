-- Clear the provisional 56-entry ISEF fair dataset so the app re-seeds cleanly
-- with the new 265-entry scraped dataset (confirmed 2026 dates, geocoded coords,
-- new key format). Fair events linked to seeded fairs are dropped first to
-- satisfy the FK constraint; any AI-synced events are also cleared here since
-- they referenced the old fair IDs.
DELETE FROM "fair_events"
WHERE "fair_id" IN (SELECT "id" FROM "fairs" WHERE "seed_key" IS NOT NULL);

DELETE FROM "fairs" WHERE "seed_key" IS NOT NULL;

-- REFACTOR2 P1-S10: `Fair` and `FairEvent` are GLOBAL rows shared by every team,
-- but any student matched to a fair could trigger a paid Firecrawl crawl. N
-- students in the same state each paid for the same fair, concurrently, and the
-- read-then-write on the shared event row was last-writer-wins.
--
-- The claim elects one crawler; `last_synced_at` is the cooldown that stops
-- repeat spend; `last_synced_by_user_id` gives a shared row some provenance.

ALTER TABLE "fairs"
  ADD COLUMN "sync_claimed_at"        TIMESTAMP(3),
  ADD COLUMN "last_synced_at"         TIMESTAMP(3),
  ADD COLUMN "last_synced_by_user_id" TEXT;

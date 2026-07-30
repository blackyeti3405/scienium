-- REFACTOR2 P1-R7: `link_only` anonymous access was protected by `slug`, whose
-- only unguessable part is six hex characters — 24 bits. Request limiting slows
-- enumeration but does not turn a small, predictable namespace into a capability
-- for a minor's project work.
--
-- Existing link_only URLs stop working by design: a 24-bit link cannot be
-- "upgraded" in place, only replaced. Teams re-copy the new link from the editor.

ALTER TABLE "showcases" ADD COLUMN "share_token" TEXT;

-- Backfill with real randomness. Two v4 UUIDs give ~244 bits, well past the
-- 128-bit floor, and `gen_random_uuid()` is built in (PG13+) so this needs no
-- extension. New tokens are minted in application code by `makeShareToken()`.
UPDATE "showcases"
SET "share_token" =
  replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
WHERE "share_token" IS NULL;

CREATE UNIQUE INDEX "showcases_share_token_key" ON "showcases"("share_token");

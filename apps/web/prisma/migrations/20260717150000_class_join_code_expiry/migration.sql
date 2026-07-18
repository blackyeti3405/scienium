-- SEC2-003: classroom join codes expire. Additive column; existing codes are
-- backfilled with a fresh 30-day window (rather than dying instantly or living
-- forever) so in-flight classroom onboarding is unaffected.
ALTER TABLE "classes" ADD COLUMN "join_code_expires_at" TIMESTAMP(3);

UPDATE "classes"
SET "join_code_expires_at" = NOW() + INTERVAL '30 days'
WHERE "join_code" IS NOT NULL;

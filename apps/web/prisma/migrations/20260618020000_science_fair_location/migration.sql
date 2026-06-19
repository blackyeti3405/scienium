-- Feature 3: location-based Science Fair gateway.

-- 3a. US location on the team, used to match nearest fairs.
ALTER TABLE "teams" ADD COLUMN "location_zip" TEXT;
ALTER TABLE "teams" ADD COLUMN "location_state" TEXT;

-- 3b. Representative coordinates + a stable seed key on fairs, so the affiliated-
-- fair dataset (lib/fairs/dataset.ts) can be upserted idempotently and matched by
-- distance.
ALTER TABLE "fairs" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "fairs" ADD COLUMN "longitude" DOUBLE PRECISION;
ALTER TABLE "fairs" ADD COLUMN "seed_key" TEXT;

CREATE UNIQUE INDEX "fairs_seed_key_key" ON "fairs"("seed_key");

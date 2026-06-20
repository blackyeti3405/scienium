-- Showcase competition format: short title + new required/optional asset types.
ALTER TABLE "showcases" ADD COLUMN IF NOT EXISTS "short_title" TEXT NOT NULL DEFAULT '';

-- New AssetType values. ADD VALUE IF NOT EXISTS is idempotent; not referenced in
-- this same migration, so it commits cleanly.
ALTER TYPE "asset_type" ADD VALUE IF NOT EXISTS 'quad_chart';
ALTER TYPE "asset_type" ADD VALUE IF NOT EXISTS 'demo_video';
ALTER TYPE "asset_type" ADD VALUE IF NOT EXISTS 'supplement';

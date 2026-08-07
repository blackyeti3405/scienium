-- Spell catalog gains a display name (the spell bar was showing the BUILDING's
-- name) and a float radius (blast radius is now in plot tiles: 1.5 / 2.5 / 3.5).
ALTER TABLE "spells" ADD COLUMN "name" TEXT NOT NULL DEFAULT '',
                     ALTER COLUMN "radius" SET DATA TYPE DOUBLE PRECISION;

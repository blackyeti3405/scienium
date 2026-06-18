-- Track KP already granted per source (literature-review quiz proficiency reward).
-- High-water mark, capped at 100 KP per paper; defaults to 0 for existing rows.
ALTER TABLE "papers" ADD COLUMN "kp_awarded" INTEGER NOT NULL DEFAULT 0;

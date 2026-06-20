-- Proof of Expertise / Clearance Level + purchasable shop buildings.
-- Written idempotently so it applies cleanly whether or not earlier state was
-- created via `prisma db push`. `expertise_attempts` is restructured (it held no
-- data and was unreferenced by code), so it is dropped and recreated to belong to
-- an exam session rather than carrying a standalone clearance snapshot.

-- ── Proof of Expertise: exam sessions + per-question graded attempts ──────────

CREATE TABLE IF NOT EXISTS "expertise_exams" (
  "id"             TEXT NOT NULL,
  "team_id"        TEXT NOT NULL,
  "user_id"        TEXT NOT NULL,
  "target_level"   INTEGER NOT NULL,
  "questions_json" JSONB NOT NULL,
  "score"          INTEGER,
  "passed"         BOOLEAN NOT NULL DEFAULT false,
  "graded_at"      TIMESTAMP(3),
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "expertise_exams_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "expertise_exams_team_id_graded_at_idx"
  ON "expertise_exams" ("team_id", "graded_at");

-- Restructure expertise_attempts (drop the old standalone shape, recreate bound
-- to an exam). Safe: no rows, no code reads it.
DROP TABLE IF EXISTS "expertise_attempts" CASCADE;

CREATE TABLE "expertise_attempts" (
  "id"         TEXT NOT NULL,
  "exam_id"    TEXT NOT NULL,
  "user_id"    TEXT NOT NULL,
  "question"   TEXT NOT NULL,
  "response"   TEXT NOT NULL,
  "evaluation" TEXT NOT NULL DEFAULT '',
  "score"      INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "expertise_attempts_pkey" PRIMARY KEY ("id")
);

-- ── Purchasable shop buildings (catalog-keyed ownership) ─────────────────────

CREATE TABLE IF NOT EXISTS "team_shop_buildings" (
  "id"                   TEXT NOT NULL,
  "team_id"              TEXT NOT NULL,
  "building_key"         TEXT NOT NULL,
  "purchased_by_user_id" TEXT NOT NULL,
  "purchased_at"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "team_shop_buildings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "team_shop_buildings_team_id_building_key_key"
  ON "team_shop_buildings" ("team_id", "building_key");

-- ── Foreign keys (guarded so re-runs don't error) ────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expertise_exams_team_id_fkey') THEN
    ALTER TABLE "expertise_exams" ADD CONSTRAINT "expertise_exams_team_id_fkey"
      FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expertise_exams_user_id_fkey') THEN
    ALTER TABLE "expertise_exams" ADD CONSTRAINT "expertise_exams_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expertise_attempts_exam_id_fkey') THEN
    ALTER TABLE "expertise_attempts" ADD CONSTRAINT "expertise_attempts_exam_id_fkey"
      FOREIGN KEY ("exam_id") REFERENCES "expertise_exams"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expertise_attempts_user_id_fkey') THEN
    ALTER TABLE "expertise_attempts" ADD CONSTRAINT "expertise_attempts_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_shop_buildings_team_id_fkey') THEN
    ALTER TABLE "team_shop_buildings" ADD CONSTRAINT "team_shop_buildings_team_id_fkey"
      FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_shop_buildings_purchased_by_user_id_fkey') THEN
    ALTER TABLE "team_shop_buildings" ADD CONSTRAINT "team_shop_buildings_purchased_by_user_id_fkey"
      FOREIGN KEY ("purchased_by_user_id") REFERENCES "users"("id") ON UPDATE CASCADE ON DELETE RESTRICT;
  END IF;
END $$;

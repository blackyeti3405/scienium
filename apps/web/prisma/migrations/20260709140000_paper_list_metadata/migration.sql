-- Phase 4: persist paper list metadata so the list never reads full text, and
-- prevent duplicate uploads at the database level.
ALTER TABLE "papers"
  ADD COLUMN "doi" TEXT,
  ADD COLUMN "credibility_tier" "credibility_tier",
  ADD COLUMN "source_host" TEXT;

-- Duplicate-upload guard. Postgres treats NULL content_hash as distinct, so
-- legacy/non-PDF rows (null hash) are unaffected; two identical PDF uploads for
-- one team can never both persist.
--
-- REFACTOR2 P1-S14 correction. This block used to say it "assumes no
-- pre-existing duplicate (team_id, content_hash) pairs — application-level
-- dedup has been in place." That is an assumption about the old code, not a
-- property of the data, and one surviving pair aborts the whole deploy.
--
-- QUARANTINE rather than delete: a Paper is the parent of quizzes,
-- proficiencies, explanations, chat, citations, vocabulary, and discovery
-- nodes. Removing a duplicate row destroys real student work. Clearing
-- `content_hash` on the later copies keeps every row and every child intact and
-- only gives up duplicate-detection for those specific legacy papers — the
-- earliest upload per (team, hash) keeps its hash and stays the canonical one.
UPDATE "papers" p
SET "content_hash" = NULL
FROM (
  SELECT id,
         row_number() OVER (
           PARTITION BY "team_id", "content_hash"
           ORDER BY "created_at", "id"
         ) AS rn
  FROM "papers"
  WHERE "content_hash" IS NOT NULL
) ranked
WHERE p.id = ranked.id
  AND ranked.rn > 1;

CREATE UNIQUE INDEX "papers_team_id_content_hash_key" ON "papers"("team_id", "content_hash");

CREATE INDEX "papers_team_id_created_at_idx" ON "papers"("team_id", "created_at");
CREATE INDEX "papers_team_id_status_idx" ON "papers"("team_id", "status");

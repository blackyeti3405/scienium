-- Phase 4: persist paper list metadata so the list never reads full text, and
-- prevent duplicate uploads at the database level.
ALTER TABLE "papers"
  ADD COLUMN "doi" TEXT,
  ADD COLUMN "credibility_tier" "credibility_tier",
  ADD COLUMN "source_host" TEXT;

-- Duplicate-upload guard. Postgres treats NULL content_hash as distinct, so
-- legacy/non-PDF rows (null hash) are unaffected; two identical PDF uploads for
-- one team can never both persist. (Assumes no pre-existing duplicate (team_id,
-- content_hash) pairs — application-level dedup has been in place.)
CREATE UNIQUE INDEX "papers_team_id_content_hash_key" ON "papers"("team_id", "content_hash");

CREATE INDEX "papers_team_id_created_at_idx" ON "papers"("team_id", "created_at");
CREATE INDEX "papers_team_id_status_idx" ON "papers"("team_id", "status");

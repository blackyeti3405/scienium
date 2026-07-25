-- REFACTOR2 P1-S6: explain-back derived `attempt_no` from a read taken BEFORE a
-- multi-second Anthropic call, so two concurrent submissions minted the SAME
-- attempt number (and a slower failing result recomputed best/passed from that
-- stale read, overwriting a pass that had landed meanwhile).
--
-- The route now derives the number under the per-(paper, user) lock. This index
-- makes the invariant structural. Dedupe first (the P1-S14 lesson): renumber
-- historical collisions by creation order rather than deleting a student's work.

WITH renumbered AS (
  SELECT "id",
         ROW_NUMBER() OVER (
           PARTITION BY "paper_id", "user_id"
           ORDER BY "created_at", "id"
         ) AS seq
  FROM "paper_explanation_attempts"
)
UPDATE "paper_explanation_attempts" a
SET "attempt_no" = r.seq
FROM renumbered r
WHERE a."id" = r."id" AND a."attempt_no" <> r.seq;

CREATE UNIQUE INDEX "paper_explanation_attempts_paper_id_user_id_attempt_no_key"
  ON "paper_explanation_attempts"("paper_id", "user_id", "attempt_no");

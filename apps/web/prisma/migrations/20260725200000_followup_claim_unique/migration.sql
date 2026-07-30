-- REFACTOR2 P1-S7: "one follow-up per entry" and the per-team daily cap were
-- both advisory — checked by a pre-read BEFORE the paid Anthropic call, with no
-- constraint behind them. Two concurrent requests could both pay, both insert,
-- and overshoot the daily cap.
--
-- The unique index turns the row into a claim the route can take BEFORE
-- spending. Dedupe first (the P1-S14 lesson): keep the oldest follow-up per
-- entry, since that is the one the student has most likely already answered.

DELETE FROM "project_log_followups" dup
USING "project_log_followups" keep
WHERE dup."project_log_id" = keep."project_log_id"
  AND (
    dup."created_at" > keep."created_at"
    OR (dup."created_at" = keep."created_at" AND dup."id" > keep."id")
  );

CREATE UNIQUE INDEX "project_log_followups_project_log_id_key"
  ON "project_log_followups"("project_log_id");

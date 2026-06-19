-- Persist the latest idea-check result on the plan so it survives reloads and is
-- replaced (not appended) on each re-run. The `idea_checks` table stays as the
-- per-day rate-limit ledger.
ALTER TABLE "research_plans" ADD COLUMN "last_idea_check_json" JSONB;
ALTER TABLE "research_plans" ADD COLUMN "last_idea_check_at" TIMESTAMP(3);

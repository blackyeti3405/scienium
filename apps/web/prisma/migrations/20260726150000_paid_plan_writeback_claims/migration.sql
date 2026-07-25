-- P1-S9: versionless paid writebacks.
--
-- The three plan-driven paid workflows (codex study plan, research-plan review,
-- idea check) read a source, called out, and wrote back unconditionally. Slow
-- old work could overwrite newer truth, and concurrent same-input callers could
-- both pay.
--
-- Two mechanisms, no data change:
--   * pre-call claims for the two streaming workflows, which also make the
--     idea-check daily cap exact (the count is read while holding the claim);
--   * `pending_source_hash`, stamped when the study-plan slot is reserved, so
--     the commit is a compare-and-set on the source the work was generated from.
ALTER TABLE "research_plans" ADD COLUMN "review_claimed_at" TIMESTAMP(3);
ALTER TABLE "research_plans" ADD COLUMN "idea_check_claimed_at" TIMESTAMP(3);
ALTER TABLE "team_study_plans" ADD COLUMN "pending_source_hash" TEXT;

-- REFACTOR2 P1-R2: the literature_review -> research_planning advance reads the
-- phase, runs a PAID Haiku classification, then wrote with an unconditional
-- `team.update({ id })`. Two concurrent clicks both paid and both wrote, and a
-- request whose model call returned after another transition overwrote the newer
-- phase with `research_planning` — rolling the team backwards through the arc.
--
-- The self-advance transitions in the same route already used a conditional
-- updateMany; this claim plus a compare-and-set brings the paid path in line.

ALTER TABLE "teams" ADD COLUMN "advance_claimed_at" TIMESTAMP(3);

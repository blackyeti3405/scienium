-- REFACTOR2 P1-R11: retry-question GENERATION had a pre-call claim (A8); retry
-- GRADING had none. Two concurrent submissions both loaded the same failed
-- session and both called Anthropic before taking the advisory lock — the lock
-- protected the KP high-water arithmetic only after the money was spent.

ALTER TABLE "paper_quiz_sessions" ADD COLUMN "retry_grade_claimed_at" TIMESTAMP(3);

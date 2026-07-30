-- REFACTOR2 P1-R3 (budget half), part 1: accounting + kill switch.
--
-- Token counts were already emitted as structured `llm.call` log events, but a
-- log cannot answer "what did period 3 spend yesterday". These rows can, and
-- they join to class and school through `teams`.
--
-- No enforcement yet — nothing reads this to refuse work. Caps come from a week
-- of real classroom data, not from a guess.

-- Per-team kill switch. The global one is the AI_KILL_SWITCH env var.
ALTER TABLE "teams" ADD COLUMN "ai_disabled_at" TIMESTAMP(3);

CREATE TABLE "ai_usage" (
    "id" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "team_id" TEXT,
    "user_id" TEXT,
    -- Disjoint input buckets: input_tokens is the UNCACHED remainder.
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "cache_read_input_tokens" INTEGER NOT NULL DEFAULT 0,
    "cache_creation_input_tokens" INTEGER NOT NULL DEFAULT 0,
    -- Micro-dollars; integer so a running total never accumulates float error.
    "cost_micros" INTEGER NOT NULL DEFAULT 0,
    "rate_version" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_usage_team_id_day_idx" ON "ai_usage"("team_id", "day");
CREATE INDEX "ai_usage_day_idx" ON "ai_usage"("day");
CREATE INDEX "ai_usage_operation_day_idx" ON "ai_usage"("operation", "day");

-- SET NULL, not CASCADE: a deleted team must not erase what it spent.
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_team_id_fkey"
  FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

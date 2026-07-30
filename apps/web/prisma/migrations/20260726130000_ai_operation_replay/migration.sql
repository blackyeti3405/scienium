-- REFACTOR2 P1-R3 (replay half), closing the remainders of P1-R11, P1-S6, P1-R2.
--
-- Claim columns stop two callers paying at the same time, but they cannot answer
-- the other question: a caller that retries after a timeout, or arrives second,
-- has no way to get the result the first call already paid for — it either pays
-- again or fails. Storing the outcome against a hash of the INPUTS lets an
-- identical request replay instead of re-spending.

CREATE TYPE "ai_operation_status" AS ENUM ('running', 'succeeded', 'failed');

CREATE TABLE "ai_operations" (
  "id"              TEXT NOT NULL,
  "operation"       TEXT NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "team_id"         TEXT,
  "status"          "ai_operation_status" NOT NULL DEFAULT 'running',
  "result_json"     JSONB,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at"    TIMESTAMP(3),
  CONSTRAINT "ai_operations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_operations_operation_idempotency_key_key"
  ON "ai_operations"("operation", "idempotency_key");
CREATE INDEX "ai_operations_status_created_at_idx"
  ON "ai_operations"("status", "created_at");

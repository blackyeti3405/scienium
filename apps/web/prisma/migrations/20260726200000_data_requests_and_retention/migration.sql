-- REFACTOR2 P1-R9 — deletion/export as system behaviour instead of a runbook.
--
-- Three tables and one column:
--   data_requests       the durable request + its outcome. NO FK to users: the
--                       row is the record that an erasure happened and must
--                       outlive the identity it erased.
--   data_request_steps  the per-external-system outbox (clerk / storage /
--                       postgres / export_bundle). `(request_id, target)` unique
--                       is what makes a resumed run idempotent.
--   retention_policies  ships EMPTY. Every window in it needs qualified
--                       FERPA/COPPA input (docs/TODO.md → "Retention windows").
--                       lib/retention/policies.ts declares what CAN be pruned;
--                       a row here is the number that turns one on.
--   users.deleted_at    erasure tombstone. The users row is not dropped —
--                       team-shared authored work carries a required FK to it.
--
-- No unique index is created over pre-existing data, so the dedupe/quarantine
-- preflight rule (P1-S14) does not apply: all three tables are new and empty.

ALTER TABLE "users" ADD COLUMN "deleted_at" TIMESTAMP(3);

CREATE TABLE "data_requests" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "subject_user_id" TEXT NOT NULL,
    "subject_clerk_user_id" TEXT NOT NULL,
    "subject_email" TEXT NOT NULL,
    "requested_by_user_id" TEXT NOT NULL,
    "request_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "decided_at" TIMESTAMP(3),
    "decided_note" TEXT,
    "claim_token" TEXT,
    "claimed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "result_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "data_requests_request_key_key" ON "data_requests"("request_key");
CREATE INDEX "data_requests_status_claimed_at_idx" ON "data_requests"("status", "claimed_at");
CREATE INDEX "data_requests_subject_user_id_idx" ON "data_requests"("subject_user_id");

CREATE TABLE "data_request_steps" (
    "id" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "detail" JSONB,
    "last_error" TEXT,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "data_request_steps_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "data_request_steps_request_id_target_key" ON "data_request_steps"("request_id", "target");

ALTER TABLE "data_request_steps" ADD CONSTRAINT "data_request_steps_request_id_fkey"
  FOREIGN KEY ("request_id") REFERENCES "data_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "retention_policies" (
    "key" TEXT NOT NULL,
    "retain_days" INTEGER,
    "note" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retention_policies_pkey" PRIMARY KEY ("key")
);

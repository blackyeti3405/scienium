-- REFACTOR2 P1-5 — the append-only security ledger.
--
-- Deliberately NO foreign keys. An audit trail that a domain DELETE can cascade
-- away is not an audit trail, and one that RESTRICTs is an audit trail that
-- blocks the teardown it exists to document. `test/pg/invariants.pg.test.ts`
-- pins that no cascade edge ever reaches this table.
--
-- `dedupe_key` is nullable and unique: retried work (a worker parking a job, a
-- daily budget sweep) supplies one so the retry appends nothing, and the events
-- that legitimately repeat leave it NULL, which Postgres treats as distinct.

-- CreateTable
CREATE TABLE "security_events" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "actor_type" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "target_type" TEXT,
    "target_id" TEXT,
    "scope_id" TEXT,
    "request_id" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dedupe_key" TEXT,

    CONSTRAINT "security_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "security_events_dedupe_key_key" ON "security_events"("dedupe_key");

-- CreateIndex
CREATE INDEX "security_events_kind_created_at_idx" ON "security_events"("kind", "created_at");

-- CreateIndex
CREATE INDEX "security_events_actor_user_id_created_at_idx" ON "security_events"("actor_user_id", "created_at");

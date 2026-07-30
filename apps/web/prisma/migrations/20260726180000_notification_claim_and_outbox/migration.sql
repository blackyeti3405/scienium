-- REFACTOR2 P1-R5: durable background work — notifications.
--
-- The run ledger recorded a team AFTER processing it, so two overlapping runs
-- read the same unchecked roster, both processed the same teams, and both
-- emailed. `notifications.dedupe_key` stopped duplicate ROWS; nothing stopped
-- the duplicate EMAIL, because the send was driven by the run's own pre-insert
-- "fresh" list rather than by anything durable.
--
-- Two changes: claim-before-work (fenced, with a lease so a crashed run's teams
-- are retried rather than stranded for the day), and an email outbox whose
-- (dedupe_key, recipient) unique makes at-most-once delivery a database
-- property.

ALTER TABLE "notification_run_teams" ADD COLUMN "claim_token" TEXT NOT NULL DEFAULT '';
ALTER TABLE "notification_run_teams" ADD COLUMN "completed_at" TIMESTAMP(3);

-- Existing rows were written under the old "record after processing" semantics,
-- so every one of them represents finished work. Mark them complete, or the new
-- claim pass would treat the whole ledger as abandoned and redo the day.
UPDATE "notification_run_teams" SET "completed_at" = "checked_at" WHERE "completed_at" IS NULL;

CREATE INDEX "notification_run_teams_run_day_completed_at_idx"
  ON "notification_run_teams"("run_day", "completed_at");

CREATE TABLE "notification_emails" (
    "id" TEXT NOT NULL,
    "dedupe_key" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "claim_token" TEXT,
    "claimed_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_emails_pkey" PRIMARY KEY ("id")
);

-- The event key: one email per (notification, recipient), enforced by Postgres.
CREATE UNIQUE INDEX "notification_emails_dedupe_key_recipient_key"
  ON "notification_emails"("dedupe_key", "recipient");
CREATE INDEX "notification_emails_status_claimed_at_idx"
  ON "notification_emails"("status", "claimed_at");

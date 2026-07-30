-- REFACTOR2 P1-R8, the class half — class membership gets a lifecycle.
--
-- The team half (20260726190000) gave teams withdraw/leave/remove commands and
-- an append-only event log. Classes had none of it: a student could only ever be
-- moved by being approved somewhere else, and nothing recorded that a membership
-- had ended. That matters because teacher authorization is DERIVED from
-- `users.class_id` — an enrolment that should have ended but did not is a
-- teacher who can still open a student's work.
--
-- Two new statuses, because `denied` was being asked to mean three things:
--   withdrawn — the STUDENT cancelled their own pending request; nobody refused.
--   revoked   — an approved enrolment ENDED (teacher removal, or the student
--               left). It happened, and then it stopped.
--
-- No unique index is created over pre-existing data, and the enum only GAINS
-- values, so the P1-S14 dedupe/quarantine preflight rule does not apply. Adding
-- enum values is backwards compatible: every existing row keeps its status.

ALTER TYPE "class_join_request_status" ADD VALUE IF NOT EXISTS 'withdrawn';
ALTER TYPE "class_join_request_status" ADD VALUE IF NOT EXISTS 'revoked';

CREATE TABLE "class_membership_events" (
    "id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_membership_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "class_membership_events_class_id_created_at_idx"
  ON "class_membership_events"("class_id", "created_at");
CREATE INDEX "class_membership_events_user_id_created_at_idx"
  ON "class_membership_events"("user_id", "created_at");

-- RESTRICT, matching `team_membership_events`: the log is the record that an
-- authorization existed and ended, so it must not vanish with its subject.
ALTER TABLE "class_membership_events" ADD CONSTRAINT "class_membership_events_class_id_fkey"
  FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "class_membership_events" ADD CONSTRAINT "class_membership_events_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

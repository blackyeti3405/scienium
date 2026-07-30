-- REFACTOR2 P2-S3 + HANDOFF #4/#5 + §0.8 — the notification subsystem's three
-- data defects, which are all one root cause: the row was modelled as "a thing
-- a TEAM has" rather than "an event, read by PEOPLE".
--
--  1. `read_at` was a single column on a row every teammate reads, so the first
--     member to open the bell marked it read for all of them. Replaced by a
--     per-member receipt table.
--  2. `team_id` was NOT NULL and the bell filtered on it, so a notice about a
--     membership that just ENDED had nowhere to live and nowhere to be read.
--  3. `notification_prefs.email` accepted any address the member typed, tied to
--     no verified identity. Dropped: reminders go to `users.email`, which is
--     mirrored from Clerk.

-- ── 1. Per-member read receipts ─────────────────────────────────────────────
CREATE TABLE "notification_reads" (
    "notification_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_reads_pkey" PRIMARY KEY ("notification_id","user_id")
);

CREATE INDEX "notification_reads_user_id_idx" ON "notification_reads"("user_id");

ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_notification_id_fkey"
    FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill, preserving what "read" MEANT for each existing row rather than
-- resetting everyone's badge:
--   - a personal notice that was read is that one member's receipt;
--   - a team-wide notice that was read was read for everybody, so every current
--     member of that team gets one. (INSERT ... SELECT, so a member who is also
--     addressed personally cannot produce a duplicate key.)
INSERT INTO "notification_reads" ("notification_id", "user_id", "read_at")
SELECT n."id", n."user_id", n."read_at"
FROM "notifications" n
WHERE n."read_at" IS NOT NULL AND n."user_id" IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO "notification_reads" ("notification_id", "user_id", "read_at")
SELECT n."id", tm."user_id", n."read_at"
FROM "notifications" n
JOIN "team_members" tm ON tm."team_id" = n."team_id"
WHERE n."read_at" IS NOT NULL AND n."user_id" IS NULL
ON CONFLICT DO NOTHING;

DROP INDEX "notifications_team_id_read_at_created_at_idx";
DROP INDEX "notifications_user_id_read_at_created_at_idx";
ALTER TABLE "notifications" DROP COLUMN "read_at";

-- ── 2. A notice can outlive the team it is about ────────────────────────────
ALTER TABLE "notifications" ALTER COLUMN "team_id" DROP NOT NULL;

-- ── 3. No unverified destination ────────────────────────────────────────────
-- Any address stored here that was not the member's Clerk-mirrored account
-- address stops being mailed the moment this runs; there is no column left to
-- read it from. `email_enabled` is deliberately kept: the member did ask for
-- reminders, and they now go to the address Clerk verified for them.
ALTER TABLE "notification_prefs" DROP COLUMN "email";

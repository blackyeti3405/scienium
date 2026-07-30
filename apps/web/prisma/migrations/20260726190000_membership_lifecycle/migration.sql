-- REFACTOR2 P1-R8: team membership had no lifecycle.
--
-- `TeamMember` permitted the same user in several teams, joining added a second
-- membership and switched `activeTeamId` while leaving the first behind, and
-- there was no leave, remove, lead-transfer, or disband command at all. Because
-- teacher visibility is DERIVED from membership, a stale membership was stale
-- authorization — a teacher still seeing a team they no longer teach.
--
-- Decision (owner, 2026-07-26): ONE TEAM AT A TIME, and archive rather than
-- delete when the last member leaves.
--
-- `TeamMember` stays live-only: a departure deletes the row and appends an event
-- here. A `leftAt` tombstone would have needed a filter at ~25 read sites,
-- several of them nested (`team.members.some(...)`) where no client extension
-- can reach — and one forgotten filter is a live authorization leak.
CREATE TABLE "team_membership_events" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    -- joined | left | removed | lead_transferred | team_archived
    "event" TEXT NOT NULL,
    "role" "member_role",
    -- Null when the system acted (e.g. auto-transfer of a departing lead).
    "actor_user_id" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_membership_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "team_membership_events_team_id_created_at_idx" ON "team_membership_events"("team_id", "created_at");
CREATE INDEX "team_membership_events_user_id_created_at_idx" ON "team_membership_events"("user_id", "created_at");

-- Archived rather than deleted: the team's work is the class's product.
ALTER TABLE "teams" ADD COLUMN "archived_at" TIMESTAMP(3);

-- Backfill the history that already happened, so the event log is not blank for
-- every existing member. Reason names it as a backfill rather than pretending
-- these were observed joins.
INSERT INTO "team_membership_events" ("id", "team_id", "user_id", "event", "role", "actor_user_id", "reason", "created_at")
SELECT
  'tme_backfill_' || md5("team_id" || ':' || "user_id"),
  "team_id", "user_id", 'joined', "role", NULL, 'backfilled_from_existing_membership', "joined_at"
FROM "team_members";


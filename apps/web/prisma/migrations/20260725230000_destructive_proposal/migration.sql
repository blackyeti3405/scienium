-- REFACTOR2 P1-R1: destructive confirmations were client assertions.
--
-- `POST /api/discovery/topic` accepted `confirmWipe` and an arbitrary
-- `confirmRemoveIds` array, so a direct caller could skip both server-proposed
-- phases and delete any ready paper ids it knew. `DELETE /api/discovery/tree`
-- wiped shared work with no confirmation at all. A boolean the client sends is
-- not a capability.
--
-- The server now issues a single-use proposal binding actor, team, command, the
-- exact payload (as a digest), and an expiry, and consumes it transactionally.

CREATE TABLE "destructive_proposals" (
  "id"             TEXT NOT NULL,
  "team_id"        TEXT NOT NULL,
  "actor_user_id"  TEXT NOT NULL,
  "command"        TEXT NOT NULL,
  "payload_digest" TEXT NOT NULL,
  "expires_at"     TIMESTAMP(3) NOT NULL,
  "consumed_at"    TIMESTAMP(3),
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "destructive_proposals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "destructive_proposals_team_id_command_expires_at_idx"
  ON "destructive_proposals"("team_id", "command", "expires_at");

ALTER TABLE "destructive_proposals"
  ADD CONSTRAINT "destructive_proposals_team_id_fkey"
  FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

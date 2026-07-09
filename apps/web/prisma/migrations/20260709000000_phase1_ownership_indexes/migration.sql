-- Phase 1: make team/classroom ownership authoritative.
--
-- Growth-path indexes for the ownership access paths. `users.active_team_id`
-- and `teams.class_id` were already indexed by 20260708180000; these cover the
-- remaining lookups the resolver and teacher scoping perform.
CREATE INDEX "users_class_id_idx" ON "users"("class_id");
CREATE INDEX "classes_teacher_id_idx" ON "classes"("teacher_id");
CREATE INDEX "team_members_team_id_idx" ON "team_members"("team_id");
CREATE INDEX "team_invites_team_id_expires_at_idx" ON "team_invites"("team_id", "expires_at");

-- Backfill any team still missing a class_id from its lead's class. 20260708180000
-- did this once; teams created since through a lead who joined a class later (the
-- team keeps class_id in sync via enrollTeamInClass, but a pre-existing null could
-- remain) are repaired here so teacher ownership no longer needs the lead-class
-- fallback in teacherOwnsTeam. Only touches still-null rows.
UPDATE "teams" t
SET "class_id" = u."class_id"
FROM "users" u
WHERE u."id" = t."team_lead_id"
  AND t."class_id" IS NULL
  AND u."class_id" IS NOT NULL;

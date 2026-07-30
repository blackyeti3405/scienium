-- REFACTOR2 P1-R8, follow-up: relations for the archived-team teacher scope.
--
-- Separate from 20260726190000 because that migration was already applied when
-- these were needed. Editing an applied migration would have left a fresh
-- database creating the constraints twice — the local one never at all.
--
-- Why the relation exists: teacher scope is derived from LIVE membership, so a
-- team archived when its last member left would drop out of the teacher's view
-- and take the class's work product with it. The event log is what carries "a
-- student of yours was once on this team".
ALTER TABLE "team_membership_events" ADD CONSTRAINT "team_membership_events_team_id_fkey"
  FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "team_membership_events" ADD CONSTRAINT "team_membership_events_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

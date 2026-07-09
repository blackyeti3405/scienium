-- Make the classroom/team boundary explicit and preserve the existing
-- "most recently joined team" behavior as a stored active-team selection.
ALTER TABLE "users" ADD COLUMN "active_team_id" TEXT;
ALTER TABLE "teams" ADD COLUMN "class_id" TEXT;

-- A team's lead defines its legacy classroom. Existing teams without a
-- classroom remain null and continue through the temporary application fallback.
UPDATE "teams" t
SET "class_id" = u."class_id"
FROM "users" u
WHERE u."id" = t."team_lead_id"
  AND u."class_id" IS NOT NULL;

-- Persist the same selection route-context previously derived on every request.
UPDATE "users" u
SET "active_team_id" = recent."team_id"
FROM (
  SELECT DISTINCT ON ("user_id") "user_id", "team_id"
  FROM "team_members"
  ORDER BY "user_id", "joined_at" DESC
) recent
WHERE recent."user_id" = u."id";

CREATE INDEX "teams_class_id_idx" ON "teams"("class_id");
CREATE INDEX "users_active_team_id_idx" ON "users"("active_team_id");

ALTER TABLE "users"
  ADD CONSTRAINT "users_active_team_id_fkey"
  FOREIGN KEY ("active_team_id") REFERENCES "teams"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "teams"
  ADD CONSTRAINT "teams_class_id_fkey"
  FOREIGN KEY ("class_id") REFERENCES "classes"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- These columns have always represented users; enforce that invariant now.
ALTER TABLE "schools"
  ADD CONSTRAINT "schools_admin_id_fkey"
  FOREIGN KEY ("admin_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "teams"
  ADD CONSTRAINT "teams_team_lead_id_fkey"
  FOREIGN KEY ("team_lead_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "vega_study_messages"
  ADD CONSTRAINT "vega_study_messages_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

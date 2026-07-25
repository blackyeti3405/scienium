-- REFACTOR2 P1-R12 (remaining half): the asset ledger must survive team deletion.
--
-- `uploaded_assets.team_id` cascaded, so removing a team destroyed the only
-- record of its R2 objects BEFORE anything could delete them — a permanent,
-- untracked orphan with no way to even discover it. Nothing deletes a Team
-- today, so this is latent rather than active; RESTRICT converts it into a loud
-- failure the moment a team-deletion command is written, forcing the correct
-- order (retire assets, then remove the team).

ALTER TABLE "uploaded_assets" DROP CONSTRAINT "uploaded_assets_team_id_fkey";

ALTER TABLE "uploaded_assets"
  ADD CONSTRAINT "uploaded_assets_team_id_fkey"
  FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Supports the reconciliation scan for `attached` rows whose owner is gone.
CREATE INDEX "uploaded_assets_status_attached_to_type_attached_to_id_idx"
  ON "uploaded_assets"("status", "attached_to_type", "attached_to_id");

-- CreateIndex
CREATE INDEX "notifications_team_id_created_at_idx" ON "notifications"("team_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");


-- Phase 7: growth-path indexes matching the common classroom-scale list/dashboard
-- access paths (project logs, quiz history, notifications, showcase, discovery,
-- teacher feedback, experiments/measurements).

-- DropIndex
DROP INDEX "experiments_team_id_idx";

-- DropIndex
DROP INDEX "measurements_experiment_id_idx";

-- DropIndex
DROP INDEX "notifications_team_id_created_at_idx";

-- DropIndex
DROP INDEX "teacher_feedback_team_id_idx";

-- CreateIndex
CREATE INDEX "discovery_nodes_team_id_visited_at_idx" ON "discovery_nodes"("team_id", "visited_at");

-- CreateIndex
CREATE INDEX "discovery_nodes_team_id_parent_id_idx" ON "discovery_nodes"("team_id", "parent_id");

-- CreateIndex
CREATE INDEX "experiments_team_id_created_at_idx" ON "experiments"("team_id", "created_at");

-- CreateIndex
CREATE INDEX "measurements_experiment_id_recorded_at_idx" ON "measurements"("experiment_id", "recorded_at");

-- CreateIndex
CREATE INDEX "notifications_team_id_read_at_created_at_idx" ON "notifications"("team_id", "read_at", "created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_created_at_idx" ON "notifications"("user_id", "read_at", "created_at");

-- CreateIndex
CREATE INDEX "paper_quiz_attempts_session_id_idx" ON "paper_quiz_attempts"("session_id");

-- CreateIndex
CREATE INDEX "paper_quiz_attempts_paper_id_user_id_created_at_idx" ON "paper_quiz_attempts"("paper_id", "user_id", "created_at");

-- CreateIndex
CREATE INDEX "paper_quiz_sessions_paper_id_user_id_created_at_idx" ON "paper_quiz_sessions"("paper_id", "user_id", "created_at");

-- CreateIndex
CREATE INDEX "project_logs_team_id_entry_type_created_at_idx" ON "project_logs"("team_id", "entry_type", "created_at");

-- CreateIndex
CREATE INDEX "project_logs_created_by_user_id_created_at_idx" ON "project_logs"("created_by_user_id", "created_at");

-- CreateIndex
CREATE INDEX "showcase_assets_showcase_id_asset_type_idx" ON "showcase_assets"("showcase_id", "asset_type");

-- CreateIndex
CREATE INDEX "showcase_views_showcase_id_viewed_at_idx" ON "showcase_views"("showcase_id", "viewed_at");

-- CreateIndex
CREATE INDEX "teacher_feedback_team_id_resolved_created_at_idx" ON "teacher_feedback"("team_id", "resolved", "created_at");


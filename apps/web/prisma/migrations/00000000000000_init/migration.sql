-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('student', 'teacher', 'admin');

-- CreateEnum
CREATE TYPE "member_role" AS ENUM ('lead', 'member');

-- CreateEnum
CREATE TYPE "lab_type" AS ENUM ('biocore', 'chemworks', 'volt_lab', 'terrabase', 'mindframe', 'axiom');

-- CreateEnum
CREATE TYPE "project_phase" AS ENUM ('discovery', 'lab_selection', 'literature_review', 'research_planning', 'working', 'showcase');

-- CreateEnum
CREATE TYPE "discovery_source" AS ENUM ('wikipedia', 'youtube', 'paper');

-- CreateEnum
CREATE TYPE "paper_source" AS ENUM ('pdf', 'text');

-- CreateEnum
CREATE TYPE "paper_status" AS ENUM ('pending', 'processing', 'ready', 'error');

-- CreateEnum
CREATE TYPE "building_role" AS ENUM ('starter', 'standard', 'premium');

-- CreateEnum
CREATE TYPE "mini_game_category" AS ENUM ('identification', 'configuration', 'prediction', 'diagnosis', 'optimization', 'decoding');

-- CreateEnum
CREATE TYPE "project_log_entry" AS ENUM ('progress', 'failure');

-- CreateEnum
CREATE TYPE "validation_status" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "privacy_level" AS ENUM ('public', 'school_only', 'link_only', 'private');

-- CreateEnum
CREATE TYPE "moderation_status" AS ENUM ('draft', 'pending_review', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "asset_type" AS ENUM ('script', 'board', 'quad_chart', 'video', 'demo_video', 'supplement', 'visual', 'report', 'repo_link');

-- CreateEnum
CREATE TYPE "fair_level" AS ENUM ('school', 'regional', 'state', 'international', 'affiliated');

-- CreateEnum
CREATE TYPE "event_status" AS ENUM ('confirmed', 'estimated');

-- CreateEnum
CREATE TYPE "form_status" AS ENUM ('not_started', 'in_progress', 'complete');

-- CreateEnum
CREATE TYPE "combat_type" AS ENUM ('empirical', 'theoretical', 'applied');

-- CreateEnum
CREATE TYPE "pvp_tier" AS ENUM ('bronze', 'silver', 'gold', 'platinum', 'diamond', 'master');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "clerk_user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "school_id" TEXT,
    "class_id" TEXT,
    "role" "user_role" NOT NULL DEFAULT 'student',
    "is_minor" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schools" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "admin_id" TEXT,

    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" TEXT NOT NULL,
    "school_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "teacher_id" TEXT NOT NULL,
    "join_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "team_lead_id" TEXT NOT NULL,
    "lab_type" "lab_type",
    "topic" TEXT,
    "phase" "project_phase" NOT NULL DEFAULT 'discovery',
    "max_members" INTEGER NOT NULL DEFAULT 3,
    "location_zip" TEXT,
    "location_state" TEXT,
    "location_lat" DOUBLE PRECISION,
    "location_lng" DOUBLE PRECISION,
    "research_idea" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_invites" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_by_user_id" TEXT,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "user_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "role" "member_role" NOT NULL DEFAULT 'member',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("user_id","team_id")
);

-- CreateTable
CREATE TABLE "team_currency" (
    "team_id" TEXT NOT NULL,
    "kp" INTEGER NOT NULL DEFAULT 0,
    "clearance_level" INTEGER NOT NULL DEFAULT 0,
    "lc" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_currency_pkey" PRIMARY KEY ("team_id")
);

-- CreateTable
CREATE TABLE "discovery_nodes" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "source_type" "discovery_source" NOT NULL,
    "wikipedia_title" TEXT,
    "youtube_video_id" TEXT,
    "youtube_title" TEXT,
    "paper_id" TEXT,
    "starred" BOOLEAN NOT NULL DEFAULT false,
    "visited_by_user_id" TEXT NOT NULL,
    "visited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discovery_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_interests" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topic_interests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "papers" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "authors" TEXT[],
    "abstract" TEXT,
    "source_type" "paper_source" NOT NULL,
    "file_url" TEXT,
    "content_hash" TEXT,
    "full_text" TEXT,
    "pdf_key" TEXT,
    "pdf_data" BYTEA,
    "status" "paper_status" NOT NULL DEFAULT 'pending',
    "uploaded_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "papers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paper_proficiency" (
    "paper_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "demonstrated" BOOLEAN NOT NULL DEFAULT false,
    "best_score" INTEGER NOT NULL DEFAULT 0,
    "kp_awarded" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paper_proficiency_pkey" PRIMARY KEY ("paper_id","user_id")
);

-- CreateTable
CREATE TABLE "paper_chat_messages" (
    "id" TEXT NOT NULL,
    "paper_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paper_chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paper_quiz_sessions" (
    "id" TEXT NOT NULL,
    "paper_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "questions_json" JSONB NOT NULL,
    "score" INTEGER,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "graded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paper_quiz_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paper_quiz_attempts" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "paper_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "evaluation" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paper_quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paper_relevance_notes" (
    "paper_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paper_relevance_notes_pkey" PRIMARY KEY ("paper_id","user_id")
);

-- CreateTable
CREATE TABLE "research_plans" (
    "team_id" TEXT NOT NULL,
    "google_doc_url" TEXT,
    "project_type" TEXT,
    "project_subtype" TEXT,
    "last_synced_text" TEXT,
    "last_synced_at" TIMESTAMP(3),
    "last_review_json" JSONB,
    "last_reviewed_at" TIMESTAMP(3),
    "last_idea_check_json" JSONB,
    "last_idea_check_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_plans_pkey" PRIMARY KEY ("team_id")
);

-- CreateTable
CREATE TABLE "idea_checks" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "findings_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idea_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buildings" (
    "id" TEXT NOT NULL,
    "lab_type" "lab_type" NOT NULL,
    "name" TEXT NOT NULL,
    "role" "building_role" NOT NULL,
    "description" TEXT NOT NULL,
    "mini_game_category" "mini_game_category" NOT NULL,

    CONSTRAINT "buildings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_buildings" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "building_id" TEXT NOT NULL,
    "current_level" INTEGER NOT NULL DEFAULT 1,
    "last_upgraded_by_user_id" TEXT,
    "last_upgraded_at" TIMESTAMP(3),

    CONSTRAINT "team_buildings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_shop_buildings" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "building_key" TEXT NOT NULL,
    "purchased_by_user_id" TEXT NOT NULL,
    "purchased_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pos_x" INTEGER,
    "pos_y" INTEGER,
    "cost_paid" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "team_shop_buildings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_gateway_placements" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "gateway_key" TEXT NOT NULL,
    "pos_x" INTEGER NOT NULL,
    "pos_y" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_gateway_placements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_credit_claims" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lab_credit_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_dispatch_content" (
    "id" TEXT NOT NULL,
    "lab_type" "lab_type" NOT NULL,
    "body" TEXT NOT NULL,
    "reflection_question" TEXT NOT NULL,
    "published_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "field_dispatch_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_dispatch_responses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "kp_awarded" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "field_dispatch_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expertise_exams" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "target_level" INTEGER NOT NULL,
    "questions_json" JSONB NOT NULL,
    "answers_json" JSONB,
    "progress_index" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "graded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expertise_exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expertise_attempts" (
    "id" TEXT NOT NULL,
    "exam_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "evaluation" TEXT NOT NULL DEFAULT '',
    "score" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expertise_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_logs" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "entry_type" "project_log_entry" NOT NULL,
    "stage" TEXT,
    "body" TEXT NOT NULL,
    "next_steps" TEXT NOT NULL DEFAULT '',
    "attendee_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "artifact_url" TEXT,
    "attachment_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_edited_by_user_id" TEXT,
    "last_edited_at" TIMESTAMP(3),

    CONSTRAINT "project_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_log_followups" (
    "id" TEXT NOT NULL,
    "project_log_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "response" TEXT,
    "answered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_log_followups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_log_references" (
    "project_log_id" TEXT NOT NULL,
    "references_log_id" TEXT NOT NULL,

    CONSTRAINT "project_log_references_pkey" PRIMARY KEY ("project_log_id","references_log_id")
);

-- CreateTable
CREATE TABLE "mini_game_plays" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "building_id" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "kp_awarded" INTEGER NOT NULL,
    "played_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mini_game_plays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phase_advance_requests" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "from_phase" "project_phase" NOT NULL,
    "to_phase" "project_phase" NOT NULL,
    "status" "validation_status" NOT NULL DEFAULT 'pending',
    "note" TEXT,
    "requested_by_user_id" TEXT NOT NULL,
    "reviewed_by_user_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "phase_advance_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_feedback" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "teacher_user_id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT,
    "body" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teacher_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "user_id" TEXT,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link_url" TEXT,
    "dedupe_key" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_prefs" (
    "user_id" TEXT NOT NULL,
    "email_enabled" BOOLEAN NOT NULL DEFAULT false,
    "email" TEXT,
    "deadline_days" INTEGER[] DEFAULT ARRAY[30, 14, 7, 1]::INTEGER[],
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_prefs_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "experiments" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "x_label" TEXT NOT NULL DEFAULT 'x',
    "y_label" TEXT NOT NULL DEFAULT 'y',
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experiments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "measurements" (
    "id" TEXT NOT NULL,
    "experiment_id" TEXT NOT NULL,
    "series" TEXT NOT NULL DEFAULT '',
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "measurements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "showcases" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "short_title" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL,
    "abstract" TEXT NOT NULL,
    "privacy_level" "privacy_level" NOT NULL DEFAULT 'private',
    "published_at" TIMESTAMP(3),
    "last_edited_at" TIMESTAMP(3) NOT NULL,
    "moderation_status" "moderation_status" NOT NULL DEFAULT 'draft',
    "moderation_note" TEXT,
    "moderated_at" TIMESTAMP(3),

    CONSTRAINT "showcases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "showcase_assets" (
    "id" TEXT NOT NULL,
    "showcase_id" TEXT NOT NULL,
    "asset_type" "asset_type" NOT NULL,
    "file_url" TEXT,
    "metadata_json" JSONB,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "showcase_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "showcase_views" (
    "id" TEXT NOT NULL,
    "showcase_id" TEXT NOT NULL,
    "visitor_fingerprint" TEXT NOT NULL,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "showcase_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fairs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" "fair_level" NOT NULL,
    "state" TEXT,
    "county" TEXT,
    "country" TEXT NOT NULL DEFAULT 'US',
    "website_url" TEXT,
    "parent_fair_id" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "seed_key" TEXT,

    CONSTRAINT "fairs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fair_events" (
    "id" TEXT NOT NULL,
    "fair_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "event_date" TIMESTAMP(3),
    "registration_deadline" TIMESTAMP(3),
    "abstract_deadline" TIMESTAMP(3),
    "venue" TEXT,
    "status" "event_status" NOT NULL DEFAULT 'estimated',
    "previous_year_event_id" TEXT,

    CONSTRAINT "fair_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fair_user_associations" (
    "user_id" TEXT NOT NULL,
    "fair_id" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fair_user_associations_pkey" PRIMARY KEY ("user_id","fair_id")
);

-- CreateTable
CREATE TABLE "rubric_versions" (
    "id" TEXT NOT NULL,
    "fair_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "rubric_json" JSONB NOT NULL,

    CONSTRAINT "rubric_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rubric_criteria" (
    "id" TEXT NOT NULL,
    "rubric_version_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "max_score" INTEGER NOT NULL,
    "checklist_items_json" JSONB NOT NULL,

    CONSTRAINT "rubric_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rubric_self_assessments" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "rubric_criterion_id" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "notes" TEXT,
    "assessed_by_user_id" TEXT NOT NULL,
    "assessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rubric_self_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "isef_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "example_subtopics_json" JSONB NOT NULL,
    "recommended_lab_type" "lab_type" NOT NULL,

    CONSTRAINT "isef_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forms_catalog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "form_code" TEXT NOT NULL,
    "required_for_levels_json" JSONB NOT NULL,
    "template_url" TEXT,
    "description" TEXT NOT NULL,

    CONSTRAINT "forms_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_form_status" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "form_id" TEXT NOT NULL,
    "status" "form_status" NOT NULL DEFAULT 'not_started',
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "team_form_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "characters" (
    "id" TEXT NOT NULL,
    "building_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "combat_type" NOT NULL,
    "base_hp" INTEGER NOT NULL,
    "base_atk" INTEGER NOT NULL,
    "base_def" INTEGER NOT NULL,
    "base_spd" INTEGER NOT NULL,
    "sprite_1_url" TEXT NOT NULL,
    "sprite_2_url" TEXT NOT NULL,

    CONSTRAINT "characters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moves" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "combat_type" NOT NULL,
    "base_damage" INTEGER NOT NULL,
    "accuracy" INTEGER NOT NULL,
    "pp" INTEGER NOT NULL,
    "secondary_effect_json" JSONB,
    "flavor_text" TEXT NOT NULL,

    CONSTRAINT "moves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character_moves" (
    "character_id" TEXT NOT NULL,
    "move_id" TEXT NOT NULL,
    "level_learned" INTEGER NOT NULL,

    CONSTRAINT "character_moves_pkey" PRIMARY KEY ("character_id","move_id")
);

-- CreateTable
CREATE TABLE "pvp_teams" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "character_slots_json" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pvp_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pvp_battles" (
    "id" TEXT NOT NULL,
    "attacker_team_id" TEXT NOT NULL,
    "defender_team_id" TEXT NOT NULL,
    "phase" "project_phase" NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "winner_team_id" TEXT,
    "trophies_delta_attacker" INTEGER,
    "trophies_delta_defender" INTEGER,
    "battle_log_json" JSONB,

    CONSTRAINT "pvp_battles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pvp_trophies" (
    "team_id" TEXT NOT NULL,
    "current_trophies" INTEGER NOT NULL DEFAULT 0,
    "tier" "pvp_tier" NOT NULL DEFAULT 'bronze',
    "season" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pvp_trophies_pkey" PRIMARY KEY ("team_id")
);

-- CreateTable
CREATE TABLE "pvp_battle_quota" (
    "team_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "battles_used" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "pvp_battle_quota_pkey" PRIMARY KEY ("team_id","date")
);

-- CreateTable
CREATE TABLE "activity_feed" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "payload_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_feed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_clerk_user_id_key" ON "users"("clerk_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "schools_name_key" ON "schools"("name");

-- CreateIndex
CREATE UNIQUE INDEX "classes_join_code_key" ON "classes"("join_code");

-- CreateIndex
CREATE UNIQUE INDEX "team_invites_code_key" ON "team_invites"("code");

-- CreateIndex
CREATE INDEX "paper_chat_messages_paper_id_user_id_idx" ON "paper_chat_messages"("paper_id", "user_id");

-- CreateIndex
CREATE INDEX "idea_checks_team_id_created_at_idx" ON "idea_checks"("team_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "team_buildings_team_id_building_id_key" ON "team_buildings"("team_id", "building_id");

-- CreateIndex
CREATE UNIQUE INDEX "team_shop_buildings_team_id_building_key_key" ON "team_shop_buildings"("team_id", "building_key");

-- CreateIndex
CREATE UNIQUE INDEX "team_gateway_placements_team_id_gateway_key_key" ON "team_gateway_placements"("team_id", "gateway_key");

-- CreateIndex
CREATE UNIQUE INDEX "lab_credit_claims_user_id_day_key" ON "lab_credit_claims"("user_id", "day");

-- CreateIndex
CREATE INDEX "field_dispatch_content_lab_type_published_date_idx" ON "field_dispatch_content"("lab_type", "published_date");

-- CreateIndex
CREATE UNIQUE INDEX "field_dispatch_content_lab_type_published_date_key" ON "field_dispatch_content"("lab_type", "published_date");

-- CreateIndex
CREATE UNIQUE INDEX "field_dispatch_responses_user_id_content_id_key" ON "field_dispatch_responses"("user_id", "content_id");

-- CreateIndex
CREATE INDEX "expertise_exams_team_id_graded_at_idx" ON "expertise_exams"("team_id", "graded_at");

-- CreateIndex
CREATE INDEX "phase_advance_requests_team_id_status_idx" ON "phase_advance_requests"("team_id", "status");

-- CreateIndex
CREATE INDEX "phase_advance_requests_status_idx" ON "phase_advance_requests"("status");

-- CreateIndex
CREATE INDEX "teacher_feedback_team_id_idx" ON "teacher_feedback"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_dedupe_key_key" ON "notifications"("dedupe_key");

-- CreateIndex
CREATE INDEX "notifications_team_id_created_at_idx" ON "notifications"("team_id", "created_at");

-- CreateIndex
CREATE INDEX "experiments_team_id_idx" ON "experiments"("team_id");

-- CreateIndex
CREATE INDEX "measurements_experiment_id_idx" ON "measurements"("experiment_id");

-- CreateIndex
CREATE UNIQUE INDEX "showcases_team_id_key" ON "showcases"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "showcases_slug_key" ON "showcases"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "fairs_seed_key_key" ON "fairs"("seed_key");

-- CreateIndex
CREATE UNIQUE INDEX "team_form_status_team_id_form_id_key" ON "team_form_status"("team_id", "form_id");

-- CreateIndex
CREATE UNIQUE INDEX "characters_building_id_key" ON "characters"("building_id");

-- CreateIndex
CREATE UNIQUE INDEX "pvp_teams_team_id_key" ON "pvp_teams"("team_id");

-- CreateIndex
CREATE INDEX "activity_feed_team_id_created_at_idx" ON "activity_feed"("team_id", "created_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_currency" ADD CONSTRAINT "team_currency_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discovery_nodes" ADD CONSTRAINT "discovery_nodes_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discovery_nodes" ADD CONSTRAINT "discovery_nodes_visited_by_user_id_fkey" FOREIGN KEY ("visited_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discovery_nodes" ADD CONSTRAINT "discovery_nodes_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "discovery_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_interests" ADD CONSTRAINT "topic_interests_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "papers" ADD CONSTRAINT "papers_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper_proficiency" ADD CONSTRAINT "paper_proficiency_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "papers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper_proficiency" ADD CONSTRAINT "paper_proficiency_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper_chat_messages" ADD CONSTRAINT "paper_chat_messages_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "papers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper_quiz_sessions" ADD CONSTRAINT "paper_quiz_sessions_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "papers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper_quiz_attempts" ADD CONSTRAINT "paper_quiz_attempts_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "papers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper_quiz_attempts" ADD CONSTRAINT "paper_quiz_attempts_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "paper_quiz_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper_relevance_notes" ADD CONSTRAINT "paper_relevance_notes_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "papers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_plans" ADD CONSTRAINT "research_plans_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idea_checks" ADD CONSTRAINT "idea_checks_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_buildings" ADD CONSTRAINT "team_buildings_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_buildings" ADD CONSTRAINT "team_buildings_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_shop_buildings" ADD CONSTRAINT "team_shop_buildings_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_shop_buildings" ADD CONSTRAINT "team_shop_buildings_purchased_by_user_id_fkey" FOREIGN KEY ("purchased_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_gateway_placements" ADD CONSTRAINT "team_gateway_placements_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_credit_claims" ADD CONSTRAINT "lab_credit_claims_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_credit_claims" ADD CONSTRAINT "lab_credit_claims_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_dispatch_responses" ADD CONSTRAINT "field_dispatch_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_dispatch_responses" ADD CONSTRAINT "field_dispatch_responses_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "field_dispatch_content"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expertise_exams" ADD CONSTRAINT "expertise_exams_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expertise_exams" ADD CONSTRAINT "expertise_exams_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expertise_attempts" ADD CONSTRAINT "expertise_attempts_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "expertise_exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expertise_attempts" ADD CONSTRAINT "expertise_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_logs" ADD CONSTRAINT "project_logs_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_logs" ADD CONSTRAINT "project_logs_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_logs" ADD CONSTRAINT "project_logs_last_edited_by_user_id_fkey" FOREIGN KEY ("last_edited_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_log_followups" ADD CONSTRAINT "project_log_followups_project_log_id_fkey" FOREIGN KEY ("project_log_id") REFERENCES "project_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_log_references" ADD CONSTRAINT "project_log_references_project_log_id_fkey" FOREIGN KEY ("project_log_id") REFERENCES "project_logs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_log_references" ADD CONSTRAINT "project_log_references_references_log_id_fkey" FOREIGN KEY ("references_log_id") REFERENCES "project_logs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mini_game_plays" ADD CONSTRAINT "mini_game_plays_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phase_advance_requests" ADD CONSTRAINT "phase_advance_requests_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phase_advance_requests" ADD CONSTRAINT "phase_advance_requests_requested_by_user_id_fkey" FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phase_advance_requests" ADD CONSTRAINT "phase_advance_requests_reviewed_by_user_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_feedback" ADD CONSTRAINT "teacher_feedback_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_feedback" ADD CONSTRAINT "teacher_feedback_teacher_user_id_fkey" FOREIGN KEY ("teacher_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_prefs" ADD CONSTRAINT "notification_prefs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiments" ADD CONSTRAINT "experiments_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiments" ADD CONSTRAINT "experiments_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "measurements" ADD CONSTRAINT "measurements_experiment_id_fkey" FOREIGN KEY ("experiment_id") REFERENCES "experiments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "showcases" ADD CONSTRAINT "showcases_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "showcase_assets" ADD CONSTRAINT "showcase_assets_showcase_id_fkey" FOREIGN KEY ("showcase_id") REFERENCES "showcases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "showcase_views" ADD CONSTRAINT "showcase_views_showcase_id_fkey" FOREIGN KEY ("showcase_id") REFERENCES "showcases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fair_events" ADD CONSTRAINT "fair_events_fair_id_fkey" FOREIGN KEY ("fair_id") REFERENCES "fairs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fair_user_associations" ADD CONSTRAINT "fair_user_associations_fair_id_fkey" FOREIGN KEY ("fair_id") REFERENCES "fairs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rubric_criteria" ADD CONSTRAINT "rubric_criteria_rubric_version_id_fkey" FOREIGN KEY ("rubric_version_id") REFERENCES "rubric_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rubric_self_assessments" ADD CONSTRAINT "rubric_self_assessments_rubric_criterion_id_fkey" FOREIGN KEY ("rubric_criterion_id") REFERENCES "rubric_criteria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rubric_self_assessments" ADD CONSTRAINT "rubric_self_assessments_assessed_by_user_id_fkey" FOREIGN KEY ("assessed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_form_status" ADD CONSTRAINT "team_form_status_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_form_status" ADD CONSTRAINT "team_form_status_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "forms_catalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_moves" ADD CONSTRAINT "character_moves_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_moves" ADD CONSTRAINT "character_moves_move_id_fkey" FOREIGN KEY ("move_id") REFERENCES "moves"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pvp_teams" ADD CONSTRAINT "pvp_teams_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pvp_trophies" ADD CONSTRAINT "pvp_trophies_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pvp_battle_quota" ADD CONSTRAINT "pvp_battle_quota_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_feed" ADD CONSTRAINT "activity_feed_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_feed" ADD CONSTRAINT "activity_feed_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


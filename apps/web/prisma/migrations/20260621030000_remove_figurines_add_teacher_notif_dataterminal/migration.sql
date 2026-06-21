-- CreateEnum
CREATE TYPE "validation_status" AS ENUM ('pending', 'approved', 'rejected');

-- DropForeignKey
ALTER TABLE "figurine_unlocks" DROP CONSTRAINT "figurine_unlocks_user_id_fkey";

-- DropForeignKey
ALTER TABLE "parental_consents" DROP CONSTRAINT "parental_consents_user_id_fkey";

-- AlterTable
ALTER TABLE "classes" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "join_code" TEXT;

-- AlterTable
ALTER TABLE "schools" ALTER COLUMN "admin_id" DROP NOT NULL;

-- DropTable
DROP TABLE "figurine_unlocks";

-- DropTable
DROP TABLE "parental_consents";

-- DropEnum
DROP TYPE "figurine_tier";

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
CREATE INDEX "activity_feed_team_id_created_at_idx" ON "activity_feed"("team_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "classes_join_code_key" ON "classes"("join_code");

-- CreateIndex
CREATE INDEX "field_dispatch_content_lab_type_published_date_idx" ON "field_dispatch_content"("lab_type", "published_date");

-- CreateIndex
CREATE UNIQUE INDEX "field_dispatch_content_lab_type_published_date_key" ON "field_dispatch_content"("lab_type", "published_date");

-- CreateIndex
CREATE UNIQUE INDEX "field_dispatch_responses_user_id_content_id_key" ON "field_dispatch_responses"("user_id", "content_id");

-- CreateIndex
CREATE UNIQUE INDEX "schools_name_key" ON "schools"("name");

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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


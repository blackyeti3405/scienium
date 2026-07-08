-- Field Codex (Feature F13): per-student lesson-progress ledger, daily-cap
-- rollup, and cached team study-plan. Purely additive (3 new tables, no
-- changes to existing tables) — content itself is typed TS modules, not DB
-- rows.

-- CreateTable
CREATE TABLE "codex_lesson_progress" (
    "user_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "track_slug" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "best_score" INTEGER NOT NULL DEFAULT 0,
    "kp_awarded" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "codex_lesson_progress_pkey" PRIMARY KEY ("user_id","lesson_id")
);

-- CreateTable
CREATE TABLE "codex_kp_days" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "lessons_completed" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "codex_kp_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_study_plans" (
    "team_id" TEXT NOT NULL,
    "tracks_json" JSONB NOT NULL,
    "source_hash" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "runs_today" INTEGER NOT NULL DEFAULT 0,
    "runs_day" DATE,
    "manual_track_slugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_study_plans_pkey" PRIMARY KEY ("team_id")
);

-- CreateIndex
CREATE INDEX "codex_lesson_progress_user_id_track_slug_idx" ON "codex_lesson_progress"("user_id", "track_slug");

-- CreateIndex
CREATE UNIQUE INDEX "codex_kp_days_user_id_day_key" ON "codex_kp_days"("user_id", "day");

-- AddForeignKey
ALTER TABLE "codex_lesson_progress" ADD CONSTRAINT "codex_lesson_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codex_lesson_progress" ADD CONSTRAINT "codex_lesson_progress_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codex_kp_days" ADD CONSTRAINT "codex_kp_days_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codex_kp_days" ADD CONSTRAINT "codex_kp_days_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_study_plans" ADD CONSTRAINT "team_study_plans_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

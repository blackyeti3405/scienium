-- Feature 2: Research Plan building.

-- One research-plan workspace per team (Google Doc paste-a-link + AI review).
CREATE TABLE "research_plans" (
    "team_id" TEXT NOT NULL,
    "google_doc_url" TEXT,
    "project_type" TEXT,
    "project_subtype" TEXT,
    "last_synced_text" TEXT,
    "last_synced_at" TIMESTAMP(3),
    "last_review_json" JSONB,
    "last_reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "research_plans_pkey" PRIMARY KEY ("team_id")
);

ALTER TABLE "research_plans" ADD CONSTRAINT "research_plans_team_id_fkey"
    FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- "Has this idea been done before?" web-search runs (rate-limited 3/day per team).
CREATE TABLE "idea_checks" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "findings_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "idea_checks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idea_checks_team_id_created_at_idx" ON "idea_checks"("team_id", "created_at");

ALTER TABLE "idea_checks" ADD CONSTRAINT "idea_checks_team_id_fkey"
    FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

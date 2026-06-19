-- Feature 1: multi-student teams with independent per-student proficiency.

-- 1b. Team join-code support: a cap on members + single-use invite codes.
ALTER TABLE "teams" ADD COLUMN "max_members" INTEGER NOT NULL DEFAULT 3;

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

CREATE UNIQUE INDEX "team_invites_code_key" ON "team_invites"("code");

ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_team_id_fkey"
    FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 1a. Per-(student, paper) proficiency. Replaces the team-global
-- papers.proficiency_demonstrated / papers.kp_awarded (kept as fallback for now).
CREATE TABLE "paper_proficiency" (
    "paper_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "demonstrated" BOOLEAN NOT NULL DEFAULT false,
    "best_score" INTEGER NOT NULL DEFAULT 0,
    "kp_awarded" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "paper_proficiency_pkey" PRIMARY KEY ("paper_id","user_id")
);

ALTER TABLE "paper_proficiency" ADD CONSTRAINT "paper_proficiency_paper_id_fkey"
    FOREIGN KEY ("paper_id") REFERENCES "papers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "paper_proficiency" ADD CONSTRAINT "paper_proficiency_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: attribute a proficiency row to the user who holds each passing quiz
-- session, taking their best passing score (KP capped at 100 per source).
INSERT INTO "paper_proficiency" ("paper_id","user_id","demonstrated","best_score","kp_awarded","updated_at")
SELECT s."paper_id", s."user_id", true, MAX(s."score"), LEAST(MAX(s."score"), 100), CURRENT_TIMESTAMP
FROM "paper_quiz_sessions" s
WHERE s."passed" = true AND s."score" IS NOT NULL
GROUP BY s."paper_id", s."user_id"
ON CONFLICT ("paper_id","user_id") DO NOTHING;

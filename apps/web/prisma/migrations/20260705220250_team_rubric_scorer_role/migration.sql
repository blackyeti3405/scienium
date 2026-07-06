-- DropIndex
DROP INDEX "team_rubric_scores_team_id_criterion_key_key";

-- AlterTable
ALTER TABLE "team_rubric_scores" ADD COLUMN     "scorer_role" TEXT NOT NULL DEFAULT 'student';

-- CreateIndex
CREATE UNIQUE INDEX "team_rubric_scores_team_id_criterion_key_scorer_role_key" ON "team_rubric_scores"("team_id", "criterion_key", "scorer_role");

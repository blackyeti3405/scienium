-- CreateTable
CREATE TABLE "team_rubric_scores" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "track" TEXT NOT NULL,
    "criterion_key" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "notes" TEXT,
    "updated_by_user_id" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_rubric_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "team_rubric_scores_team_id_criterion_key_key" ON "team_rubric_scores"("team_id", "criterion_key");

-- AddForeignKey
ALTER TABLE "team_rubric_scores" ADD CONSTRAINT "team_rubric_scores_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_rubric_scores" ADD CONSTRAINT "team_rubric_scores_updated_by_user_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


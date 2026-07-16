-- CreateTable
CREATE TABLE "paper_explanations" (
    "paper_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "best_score" INTEGER NOT NULL DEFAULT 0,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "kp_awarded" INTEGER NOT NULL DEFAULT 0,
    "latest_text" TEXT NOT NULL,
    "latest_verdict_json" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paper_explanations_pkey" PRIMARY KEY ("paper_id","user_id")
);

-- CreateTable
CREATE TABLE "paper_explanation_attempts" (
    "id" TEXT NOT NULL,
    "paper_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "attempt_no" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "accuracy" INTEGER NOT NULL DEFAULT 0,
    "completeness" INTEGER NOT NULL DEFAULT 0,
    "overall" INTEGER NOT NULL DEFAULT 0,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "verdict_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paper_explanation_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "paper_explanation_attempts_paper_id_user_id_created_at_idx" ON "paper_explanation_attempts"("paper_id", "user_id", "created_at");

-- AddForeignKey
ALTER TABLE "paper_explanations" ADD CONSTRAINT "paper_explanations_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "papers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper_explanations" ADD CONSTRAINT "paper_explanations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paper_explanation_attempts" ADD CONSTRAINT "paper_explanation_attempts_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "papers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


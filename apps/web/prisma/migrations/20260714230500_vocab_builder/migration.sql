-- CreateEnum
CREATE TYPE "vocab_source" AS ENUM ('research_glossary', 'stats_guide', 'methods_guide', 'data_quality_guide', 'paper_definition', 'paper_context');

-- CreateTable
CREATE TABLE "vocab_cards" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "paper_id" TEXT NOT NULL,
    "term_key" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "definition" TEXT NOT NULL,
    "source" "vocab_source" NOT NULL,
    "source_entry_id" TEXT,
    "quote" TEXT,
    "box" INTEGER NOT NULL DEFAULT 1,
    "due_at" TIMESTAMP(3) NOT NULL,
    "last_reviewed_at" TIMESTAMP(3),
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "lapses" INTEGER NOT NULL DEFAULT 0,
    "kp_awarded" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vocab_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vocab_kp_days" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "kp_awarded" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vocab_kp_days_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vocab_cards_user_id_team_id_due_at_idx" ON "vocab_cards"("user_id", "team_id", "due_at");

-- CreateIndex
CREATE INDEX "vocab_cards_paper_id_idx" ON "vocab_cards"("paper_id");

-- CreateIndex
CREATE UNIQUE INDEX "vocab_cards_user_id_term_key_key" ON "vocab_cards"("user_id", "term_key");

-- CreateIndex
CREATE UNIQUE INDEX "vocab_kp_days_user_id_team_id_day_key" ON "vocab_kp_days"("user_id", "team_id", "day");

-- AddForeignKey
ALTER TABLE "vocab_cards" ADD CONSTRAINT "vocab_cards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vocab_cards" ADD CONSTRAINT "vocab_cards_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vocab_cards" ADD CONSTRAINT "vocab_cards_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "papers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vocab_kp_days" ADD CONSTRAINT "vocab_kp_days_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vocab_kp_days" ADD CONSTRAINT "vocab_kp_days_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


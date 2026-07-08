-- CreateTable
CREATE TABLE "vega_study_messages" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vega_study_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vega_study_messages_team_id_created_at_idx" ON "vega_study_messages"("team_id", "created_at");

-- AddForeignKey
ALTER TABLE "vega_study_messages" ADD CONSTRAINT "vega_study_messages_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterEnum
ALTER TYPE "paper_source" ADD VALUE 'external';

-- CreateTable
CREATE TABLE "citations" (
    "id" TEXT NOT NULL,
    "paper_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "year" INTEGER,
    "apa" TEXT NOT NULL,
    "mla" TEXT NOT NULL,
    "ieee" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "citations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "citations_paper_id_key" ON "citations"("paper_id");

-- CreateIndex
CREATE INDEX "citations_team_id_idx" ON "citations"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "discovery_nodes_paper_id_key" ON "discovery_nodes"("paper_id");

-- AddForeignKey
ALTER TABLE "discovery_nodes" ADD CONSTRAINT "discovery_nodes_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "papers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citations" ADD CONSTRAINT "citations_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "papers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citations" ADD CONSTRAINT "citations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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

-- REFACTOR2 P1-S14 correction. `discovery_nodes.paper_id` has existed since
-- `_init` with no uniqueness, and promotion was a findFirst-then-create, so two
-- tree nodes claiming the same paper is exactly what the old schema permitted.
-- One such pair aborts the index below and the whole deploy.
--
-- QUARANTINE rather than delete: a node carries children (the tree) and a
-- `discovery_source_visits` row that is the once-ever KP claim — deleting it
-- would break the tree AND let the team re-earn KP it was already paid. Detach
-- the later duplicate from the paper instead. `paperId: r.paperId ?? null` is
-- already a supported node state (lib/discovery/tree-service.ts), and the
-- earliest visit keeps the paper.
UPDATE "discovery_nodes" dn
SET "paper_id" = NULL
FROM (
  SELECT id,
         row_number() OVER (PARTITION BY "paper_id" ORDER BY "visited_at", "id") AS rn
  FROM "discovery_nodes"
  WHERE "paper_id" IS NOT NULL
) ranked
WHERE dn.id = ranked.id
  AND ranked.rn > 1;

-- CreateIndex
CREATE UNIQUE INDEX "discovery_nodes_paper_id_key" ON "discovery_nodes"("paper_id");

-- AddForeignKey
ALTER TABLE "discovery_nodes" ADD CONSTRAINT "discovery_nodes_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "papers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citations" ADD CONSTRAINT "citations_paper_id_fkey" FOREIGN KEY ("paper_id") REFERENCES "papers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "citations" ADD CONSTRAINT "citations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

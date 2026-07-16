-- Discovery article sources (The Conversation + science-journalism RSS). PURELY
-- ADDITIVE on top of the existing schema:
--   * new `discovery_source` enum value `article`
--   * new `article_sources` side-table (1:1 with an article node, cascade-deleted)
-- No columns dropped, no enum values renamed/removed, no data rewritten.

-- AlterEnum
-- (Postgres allows ADD VALUE inside a transaction as long as the new value is not
--  referenced by any statement in the same transaction — it isn't here. Same
--  pattern as 20260701004819_discovery_v2_papers_tab's `source` value.)
ALTER TYPE "discovery_source" ADD VALUE 'article';

-- CreateTable
CREATE TABLE "article_sources" (
    "id" TEXT NOT NULL,
    "discovery_node_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "render_mode" TEXT NOT NULL,
    "source_name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "url" TEXT NOT NULL,
    "excerpt" TEXT,
    "html" TEXT,
    "published_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "article_sources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "article_sources_discovery_node_id_key" ON "article_sources"("discovery_node_id");

-- AddForeignKey
ALTER TABLE "article_sources" ADD CONSTRAINT "article_sources_discovery_node_id_fkey" FOREIGN KEY ("discovery_node_id") REFERENCES "discovery_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;


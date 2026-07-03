-- Discovery v2 — Feature A (Papers tab). PURELY ADDITIVE on top of `_init`:
--   * new `discovery_source` enum value `source`
--   * new enums `external_platform`, `credibility_tier`
--   * new nullable `discovery_nodes.external_id` column
--   * new `external_sources` side-table (1:1 with a source node, cascade-deleted)
--   * new unique indexes (team+external_id dedup; node 1:1)
-- No columns dropped, no enum values renamed/removed, no data rewritten.

-- AlterEnum
-- (Postgres allows ADD VALUE inside a transaction as long as the new value is not
--  referenced by any statement in the same transaction — it isn't here.)
ALTER TYPE "discovery_source" ADD VALUE 'source';

-- CreateEnum
CREATE TYPE "external_platform" AS ENUM ('arxiv', 'pubmed', 'pmc');

-- CreateEnum
CREATE TYPE "credibility_tier" AS ENUM ('peer_reviewed', 'preprint', 'open_access');

-- AlterTable
ALTER TABLE "discovery_nodes" ADD COLUMN     "external_id" TEXT;

-- CreateTable
CREATE TABLE "external_sources" (
    "id" TEXT NOT NULL,
    "discovery_node_id" TEXT NOT NULL,
    "platform" "external_platform" NOT NULL,
    "external_id" TEXT NOT NULL,
    "source_url" TEXT NOT NULL,
    "source_title" TEXT NOT NULL,
    "source_authors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source_host" TEXT NOT NULL,
    "published_at" TIMESTAMP(3),
    "credibility_tier" "credibility_tier" NOT NULL,
    "abstract" TEXT,
    "reflection" TEXT,
    "reflection_by_user_id" TEXT,
    "reflection_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_sources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "external_sources_discovery_node_id_key" ON "external_sources"("discovery_node_id");

-- CreateIndex
CREATE UNIQUE INDEX "discovery_nodes_team_id_external_id_key" ON "discovery_nodes"("team_id", "external_id");

-- AddForeignKey
ALTER TABLE "external_sources" ADD CONSTRAINT "external_sources_discovery_node_id_fkey" FOREIGN KEY ("discovery_node_id") REFERENCES "discovery_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

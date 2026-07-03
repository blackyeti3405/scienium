-- CreateTable
CREATE TABLE "external_works" (
    "id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "platform" "external_platform" NOT NULL,
    "title" TEXT NOT NULL,
    "authors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "abstract" TEXT,
    "host" TEXT NOT NULL,
    "tier" "credibility_tier" NOT NULL,
    "published_at" TEXT,
    "arxiv_id" TEXT,
    "pmid" TEXT,
    "doi" TEXT,
    "openalex_id" TEXT,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_works_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "external_works_external_id_key" ON "external_works"("external_id");

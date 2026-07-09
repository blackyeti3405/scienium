-- Phase 8: durable uploaded-asset lifecycle (track + cleanup abandoned uploads).

-- CreateEnum
CREATE TYPE "uploaded_asset_status" AS ENUM ('temporary', 'attached', 'orphaned', 'deleted');

-- CreateTable
CREATE TABLE "uploaded_assets" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "object_key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "purpose" TEXT NOT NULL,
    "attached_to_type" TEXT,
    "attached_to_id" TEXT,
    "status" "uploaded_asset_status" NOT NULL DEFAULT 'temporary',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attached_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "uploaded_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "uploaded_assets_object_key_key" ON "uploaded_assets"("object_key");

-- CreateIndex
CREATE INDEX "uploaded_assets_team_id_status_created_at_idx" ON "uploaded_assets"("team_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "uploaded_assets_attached_to_type_attached_to_id_idx" ON "uploaded_assets"("attached_to_type", "attached_to_id");

-- AddForeignKey
ALTER TABLE "uploaded_assets" ADD CONSTRAINT "uploaded_assets_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploaded_assets" ADD CONSTRAINT "uploaded_assets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


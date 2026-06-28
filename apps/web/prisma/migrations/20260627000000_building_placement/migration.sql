-- AlterTable
ALTER TABLE "team_shop_buildings" ADD COLUMN     "cost_paid" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pos_x" INTEGER,
ADD COLUMN     "pos_y" INTEGER;

-- CreateTable
CREATE TABLE "team_gateway_placements" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "gateway_key" TEXT NOT NULL,
    "pos_x" INTEGER NOT NULL,
    "pos_y" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_gateway_placements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "team_gateway_placements_team_id_gateway_key_key" ON "team_gateway_placements"("team_id", "gateway_key");

-- AddForeignKey
ALTER TABLE "team_gateway_placements" ADD CONSTRAINT "team_gateway_placements_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

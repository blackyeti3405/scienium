-- PvP raid overhaul (spec §11): drop the retired turn-based battle system and
-- building mini-games; add the raid-design tables. buildings.mini_game_category
-- is replaced by spell_type (empirical | theoretical | applied), backfilled from
-- the old category mapping in case any rows exist.

-- CreateEnum
CREATE TYPE "spell_type" AS ENUM ('empirical', 'theoretical', 'applied');

-- DropForeignKey
ALTER TABLE "character_moves" DROP CONSTRAINT "character_moves_character_id_fkey";

-- DropForeignKey
ALTER TABLE "character_moves" DROP CONSTRAINT "character_moves_move_id_fkey";

-- DropForeignKey
ALTER TABLE "characters" DROP CONSTRAINT "characters_building_id_fkey";

-- DropForeignKey
ALTER TABLE "mini_game_plays" DROP CONSTRAINT "mini_game_plays_user_id_fkey";

-- DropForeignKey
ALTER TABLE "pvp_battle_quota" DROP CONSTRAINT "pvp_battle_quota_team_id_fkey";

-- DropForeignKey
ALTER TABLE "pvp_teams" DROP CONSTRAINT "pvp_teams_team_id_fkey";

-- AlterTable: replace mini_game_category with spell_type, backfilling from the
-- category → type mapping (identification/diagnosis → empirical,
-- decoding/prediction → theoretical, configuration/optimization → applied).
ALTER TABLE "buildings" ADD COLUMN "spell_type" "spell_type";
UPDATE "buildings" SET "spell_type" = CASE "mini_game_category"::text
  WHEN 'identification' THEN 'empirical'::"spell_type"
  WHEN 'diagnosis'      THEN 'empirical'::"spell_type"
  WHEN 'decoding'       THEN 'theoretical'::"spell_type"
  WHEN 'prediction'     THEN 'theoretical'::"spell_type"
  WHEN 'configuration'  THEN 'applied'::"spell_type"
  WHEN 'optimization'   THEN 'applied'::"spell_type"
END;
ALTER TABLE "buildings" ALTER COLUMN "spell_type" SET NOT NULL;
ALTER TABLE "buildings" DROP COLUMN "mini_game_category";

-- AlterTable
ALTER TABLE "pvp_trophies" DROP COLUMN "season",
DROP COLUMN "tier";

-- DropTable
DROP TABLE "character_moves";

-- DropTable
DROP TABLE "characters";

-- DropTable
DROP TABLE "mini_game_plays";

-- DropTable
DROP TABLE "moves";

-- DropTable
DROP TABLE "pvp_battle_quota";

-- DropTable
DROP TABLE "pvp_battles";

-- DropTable
DROP TABLE "pvp_teams";

-- DropEnum
DROP TYPE "combat_type";

-- DropEnum
DROP TYPE "mini_game_category";

-- DropEnum
DROP TYPE "pvp_tier";

-- CreateTable
CREATE TABLE "spells" (
    "id" TEXT NOT NULL,
    "building_key" TEXT NOT NULL,
    "type" "spell_type" NOT NULL,
    "base_damage" INTEGER NOT NULL,
    "radius" INTEGER NOT NULL,
    "cooldown_ms" INTEGER NOT NULL,

    CONSTRAINT "spells_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pvp_raids" (
    "id" TEXT NOT NULL,
    "attacker_team_id" TEXT NOT NULL,
    "defender_team_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "percent_destroyed" DOUBLE PRECISION,
    "trophies_delta" INTEGER,
    "raid_log_json" JSONB,

    CONSTRAINT "pvp_raids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pvp_raid_quota" (
    "team_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "raids_used" INTEGER NOT NULL DEFAULT 0,
    "refinds_used" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "pvp_raid_quota_pkey" PRIMARY KEY ("team_id","date")
);

-- CreateIndex
CREATE UNIQUE INDEX "spells_building_key_key" ON "spells"("building_key");

-- AddForeignKey
ALTER TABLE "pvp_raid_quota" ADD CONSTRAINT "pvp_raid_quota_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

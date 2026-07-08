-- DropForeignKey
ALTER TABLE "field_dispatch_responses" DROP CONSTRAINT "field_dispatch_responses_content_id_fkey";

-- DropForeignKey
ALTER TABLE "field_dispatch_responses" DROP CONSTRAINT "field_dispatch_responses_user_id_fkey";

-- DropForeignKey
ALTER TABLE "field_dispatch_streak_claims" DROP CONSTRAINT "field_dispatch_streak_claims_team_id_fkey";

-- DropForeignKey
ALTER TABLE "field_dispatch_streak_claims" DROP CONSTRAINT "field_dispatch_streak_claims_user_id_fkey";

-- DropTable
DROP TABLE "field_dispatch_content";

-- DropTable
DROP TABLE "field_dispatch_responses";

-- DropTable
DROP TABLE "field_dispatch_streak_claims";


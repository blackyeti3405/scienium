-- REFACTOR2 P1-6 — public-showcase abuse controls.
--
-- Three changes, all additive except one intentional referential-action swap:
--
--  1. `showcase_reports`: one row per (reporter, showcase, reason). NO FOREIGN
--     KEY, the same rule `security_events` follows — the evidence that a page
--     was reported has to survive the removal of the page. `reporter_hash` is a
--     salted digest of an IP, never an address.
--  2. `showcases.takedown_at` / `takedown_reason`: the served-state flag the
--     public page and the asset-byte route both gate on. Deliberately separate
--     from `moderation_status`, so a restore is `takedown_at = NULL` rather
--     than a guess at which review state to put back.
--  3. `showcase_moderation_events` moves from CASCADE to RESTRICT. Under
--     CASCADE, deleting a showcase erased the record of who published it and
--     who took it down — the history was exactly as durable as the thing it
--     existed to outlive. A delete is now a loud refusal.
--
-- The two enum values are appended (never reordered), so existing rows keep
-- their ordinals. Nothing here uses them in this transaction, which is what
-- Postgres requires of `ALTER TYPE … ADD VALUE`.

-- CreateEnum
CREATE TYPE "showcase_report_reason" AS ENUM ('inappropriate', 'harassment', 'privacy', 'copyright', 'spam', 'other');

-- AlterEnum
ALTER TYPE "showcase_moderation_action" ADD VALUE 'taken_down';
ALTER TYPE "showcase_moderation_action" ADD VALUE 'restored';

-- DropForeignKey
ALTER TABLE "showcase_moderation_events" DROP CONSTRAINT "showcase_moderation_events_showcase_id_fkey";

-- AlterTable
ALTER TABLE "showcases" ADD COLUMN     "takedown_at" TIMESTAMP(3),
ADD COLUMN     "takedown_reason" TEXT;

-- CreateTable
CREATE TABLE "showcase_reports" (
    "id" TEXT NOT NULL,
    "showcase_id" TEXT NOT NULL,
    "digest" TEXT NOT NULL,
    "reason" "showcase_report_reason" NOT NULL,
    "reporter_hash" TEXT NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "showcase_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "showcase_reports_showcase_id_created_at_idx" ON "showcase_reports"("showcase_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "showcase_reports_showcase_id_reporter_hash_reason_key" ON "showcase_reports"("showcase_id", "reporter_hash", "reason");

-- AddForeignKey
ALTER TABLE "showcase_moderation_events" ADD CONSTRAINT "showcase_moderation_events_showcase_id_fkey" FOREIGN KEY ("showcase_id") REFERENCES "showcases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

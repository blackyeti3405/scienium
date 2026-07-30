-- REFACTOR2 P0-R3: bind showcase approval to the revision that was reviewed.
--
-- `moderation_status = 'approved'` was a mutable flag: a team could change the
-- title, abstract, or replace the board/quad/video AFTER approval and stay
-- approved. Approval now names a content digest, and any covered change resets
-- the showcase to review.

CREATE TYPE "showcase_moderation_action" AS ENUM (
  'submitted',
  'approved',
  'rejected',
  'revision_invalidated',
  'unpublished'
);

ALTER TABLE "showcases"
  ADD COLUMN "content_digest"  TEXT NOT NULL DEFAULT '',
  ADD COLUMN "approved_digest" TEXT;

CREATE TABLE "showcase_moderation_events" (
  "id"            TEXT NOT NULL,
  "showcase_id"   TEXT NOT NULL,
  "digest"        TEXT NOT NULL,
  "action"        "showcase_moderation_action" NOT NULL,
  "actor_user_id" TEXT,
  "note"          TEXT,
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "showcase_moderation_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "showcase_moderation_events_showcase_id_created_at_idx"
  ON "showcase_moderation_events"("showcase_id", "created_at");

ALTER TABLE "showcase_moderation_events"
  ADD CONSTRAINT "showcase_moderation_events_showcase_id_fkey"
  FOREIGN KEY ("showcase_id") REFERENCES "showcases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill FAILS CLOSED. Existing approved rows were approved under the old
-- mutable flag, so there is no evidence of which revision a teacher saw. Leaving
-- `approved_digest` NULL would make every one of them read as "approved, but not
-- for the content we serve" — which is the truth. Public showcases therefore go
-- back to pending_review rather than silently staying live on an unverifiable
-- approval. link_only/private are unaffected (they never required review).
UPDATE "showcases"
SET "moderation_status" = 'pending_review', "moderated_at" = NULL
WHERE "moderation_status" = 'approved' AND "privacy_level" = 'public';

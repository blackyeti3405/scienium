-- Phase 6: server-owned chat turns with durable status.
CREATE TYPE "chat_message_status" AS ENUM ('pending', 'complete', 'error');

ALTER TABLE "paper_chat_messages"
  ADD COLUMN "status" "chat_message_status" NOT NULL DEFAULT 'complete',
  ADD COLUMN "request_id" TEXT,
  ADD COLUMN "error" TEXT,
  ADD COLUMN "token_usage_json" JSONB;

ALTER TABLE "vega_study_messages"
  ADD COLUMN "status" "chat_message_status" NOT NULL DEFAULT 'complete',
  ADD COLUMN "request_id" TEXT,
  ADD COLUMN "error" TEXT,
  ADD COLUMN "token_usage_json" JSONB;

-- Ordered-history index: replace (paper_id, user_id) with (paper_id, user_id, created_at).
DROP INDEX "paper_chat_messages_paper_id_user_id_idx";
CREATE INDEX "paper_chat_messages_paper_id_user_id_created_at_idx"
  ON "paper_chat_messages"("paper_id", "user_id", "created_at");

-- Bounce and complaint suppression for reminder email (REFACTOR2 P1-2).
--
-- Written by the Resend webhook, read by `sendNotificationEmail` before every
-- send. The address is the primary key: a mailbox can outlive the account, and a
-- spam complaint attaches to the mailbox that made it.
--
-- The `notifications_team_id_fkey` drop/re-add that `migrate diff` also emits is
-- PRE-EXISTING drift unrelated to this change and is deliberately not included.

-- CreateTable
CREATE TABLE "email_suppressions" (
    "email" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_suppressions_pkey" PRIMARY KEY ("email")
);

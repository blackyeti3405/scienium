-- REFACTOR2 P1-R12: the reclaim sweep flipped a row to the TERMINAL `deleted`
-- state and only then called R2. A caught rejection was handled, but a process
-- death, function timeout, or lost machine between the two left a live object
-- behind a terminal ledger row that no future sweep would ever select — a
-- permanent orphan still charged against the team's quota.
--
-- `deleting` is the intermediate, retryable state: claim it, delete the object,
-- then mark `deleted`. A `deleting` row whose lease has aged out is reclaimed.

ALTER TYPE "uploaded_asset_status" ADD VALUE IF NOT EXISTS 'deleting' BEFORE 'deleted';

ALTER TABLE "uploaded_assets"
  ADD COLUMN "delete_lease_at"  TIMESTAMP(3),
  ADD COLUMN "delete_attempts"  INTEGER NOT NULL DEFAULT 0;

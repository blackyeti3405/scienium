-- P1-S5: fence the paper-processing claim.
--
-- The lease already allowed a stale takeover after five minutes, but every
-- terminal write was keyed on `paper_id` alone. A revived old worker could
-- overwrite the new owner's success or failure. `claim_token` is rewritten on
-- each claim; terminal writes are conditional on it.
ALTER TABLE "paper_processing_jobs" ADD COLUMN "claim_token" TEXT;

-- Existing `running` rows have no token. They are already past or near their
-- lease; leaving the column NULL means their owner (if any) cannot terminalize,
-- and the stale-takeover path re-claims them normally.

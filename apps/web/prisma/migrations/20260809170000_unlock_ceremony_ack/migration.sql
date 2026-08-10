-- Acknowledgement for the "BUILDING UNLOCKED" ceremony.
--
-- Null for every existing team, which is correct: they were all just reset to
-- `discovery`, whose gateways are placed for them at creation, so none is owed a
-- ceremony. The first one fires when a team reaches literature_review.
ALTER TABLE "teams" ADD COLUMN "unlock_ack_phase" "project_phase";

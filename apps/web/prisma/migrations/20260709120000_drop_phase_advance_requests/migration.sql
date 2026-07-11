-- Scrap the teacher phase-validation pipeline. Phase advancement is now fully
-- self-paced (literature_review → research_planning is gated on sources +
-- proficiency; later transitions are free student clicks), so the request/review
-- table and its status enum are no longer used.
DROP TABLE IF EXISTS "phase_advance_requests";
DROP TYPE IF EXISTS "validation_status";

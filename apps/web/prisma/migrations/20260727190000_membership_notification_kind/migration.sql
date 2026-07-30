-- REFACTOR2 P1-R8 leftover — a teacher removal is now told to the student.
--
-- The class half (20260726210000) shipped `removeFromClass` and recorded it in
-- `class_membership_events`, but nothing reached the student: they discovered
-- their enrolment had ended by noticing their teacher could no longer see their
-- work. The event log answers "what happened" for a teacher; it is not a
-- channel to the person it happened to.
--
-- `membership_changed` is a new `notification_kind` so the bell can render it
-- distinctly and `lib/retention/policies.ts` can be given its own window later —
-- reusing `teacher_feedback` would have made a removal indistinguishable from a
-- comment in both places.
--
-- Enum values are only ADDED, so every existing row keeps its kind and the
-- P1-S14 dedupe/quarantine preflight rule does not apply (no unique index is
-- created over pre-existing data).

ALTER TYPE "notification_kind" ADD VALUE IF NOT EXISTS 'membership_changed';

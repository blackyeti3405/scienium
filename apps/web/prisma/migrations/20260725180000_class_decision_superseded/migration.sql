-- REFACTOR2 P1-S2: class approve/deny had contradictory terminal states.
--
-- The route pre-read `status: 'pending'` and then acted on that stale snapshot:
-- approval silently no-opped (while still reporting success) and denial wrote
-- unconditionally, so approve-then-deny left a student enrolled against a
-- DENIED request. Competing approvals were also last-writer-wins on
-- `User.classId`, leaving two `approved` rows for one student.
--
-- `superseded` names the second case honestly: the approval was real, a later
-- approval into another class replaced it. It is not a denial.

ALTER TYPE "class_join_request_status" ADD VALUE IF NOT EXISTS 'superseded';

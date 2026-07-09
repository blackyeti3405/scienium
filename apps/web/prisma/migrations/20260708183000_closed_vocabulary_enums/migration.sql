CREATE TYPE "message_role" AS ENUM ('user', 'assistant');
CREATE TYPE "feedback_target" AS ENUM ('team', 'project_log', 'paper', 'showcase');
CREATE TYPE "notification_kind" AS ENUM (
  'fair_deadline',
  'urgency',
  'teacher_feedback',
  'phase_reviewed',
  'showcase_reviewed'
);
CREATE TYPE "rubric_track" AS ENUM ('science', 'engineering');
CREATE TYPE "rubric_scorer_role" AS ENUM ('student', 'teacher');

ALTER TABLE "paper_chat_messages"
  ALTER COLUMN "role" TYPE "message_role" USING "role"::"message_role";
ALTER TABLE "vega_study_messages"
  ALTER COLUMN "role" TYPE "message_role" USING "role"::"message_role";
ALTER TABLE "teacher_feedback"
  ALTER COLUMN "target_type" TYPE "feedback_target" USING "target_type"::"feedback_target";
ALTER TABLE "notifications"
  ALTER COLUMN "kind" TYPE "notification_kind" USING "kind"::"notification_kind";
ALTER TABLE "team_rubric_scores"
  ALTER COLUMN "track" TYPE "rubric_track" USING "track"::"rubric_track",
  ALTER COLUMN "scorer_role" DROP DEFAULT,
  ALTER COLUMN "scorer_role" TYPE "rubric_scorer_role" USING "scorer_role"::"rubric_scorer_role",
  ALTER COLUMN "scorer_role" SET DEFAULT 'student';

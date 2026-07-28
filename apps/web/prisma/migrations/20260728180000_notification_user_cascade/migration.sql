-- REFACTOR2 P2-6: a personal notification must never become a broadcast.
--
-- `notifications.user_id` was ON DELETE SET NULL (Prisma's implicit rule for an
-- optional relation). But NULL is not "unaddressed" on this table — it means
-- TEAM-WIDE, and the bell shows every team-wide row for the team the reader is
-- acting as. So deleting a user re-addressed their private notices ("You were
-- removed from <class>") to the whole team the row still names.
--
-- CASCADE instead: a notice addressed to one student dies with that student.
-- Team-wide rows (user_id already NULL) are untouched.
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_user_id_fkey";
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

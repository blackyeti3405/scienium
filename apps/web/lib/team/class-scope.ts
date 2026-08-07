import 'server-only'
import { db } from '@/lib/db'

/**
 * Which classes a TEAM belongs to.
 *
 * ADR-004 made class membership per-STUDENT (`User.classId`); `Team.classId` is
 * vestigial and is never written for teams created since. Ownership is therefore
 * derived from members — the same traversal `lib/teacher/auth.ts::teacherOwnsTeam`
 * uses, which is the one authoritative tenancy model.
 *
 * Lives under `lib/team/` rather than `lib/pvp/` because two unrelated features
 * ask this question: PvP asks it to scope raids, and phase progression asks it to
 * decide whether a lab advances itself or waits for a teacher.
 */

/** Distinct class ids this team's members belong to (empty if none are enrolled). */
export async function teamClassIds(teamId: string): Promise<string[]> {
  const team = await db.team.findUnique({
    where: { id: teamId },
    select: { members: { select: { user: { select: { classId: true } } } } },
  })
  return [
    ...new Set(
      (team?.members ?? [])
        .map((m) => m.user.classId)
        .filter((id): id is string => id !== null),
    ),
  ]
}

/**
 * True when this lab belongs to a classroom, and so does NOT pace itself.
 *
 * A team with no class is self-paced: locking a topic or submitting a research
 * idea moves it immediately. A team in a class advances only when its teacher
 * says so — the teacher is running a unit, and a lab that raced ahead on its own
 * would be sitting in a phase the rest of the room has not reached.
 */
export async function isTeacherPaced(teamId: string): Promise<boolean> {
  return (await teamClassIds(teamId)).length > 0
}

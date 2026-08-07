/**
 * PvP class scoping — who a team may raid, and who it ranks against.
 *
 * ADR-004 made class membership per-STUDENT (`User.classId`); `Team.classId` is
 * vestigial and is never written for teams created after that change. PvP was
 * built on `Team.classId`, so every post-ADR-004 team matched an empty pool and
 * the lobby read "No opponents found in your class" forever. Ownership is
 * derived from members here, the same way `lib/teacher/auth.ts::teacherOwnsTeam`
 * derives teacher scope — that is the one authoritative tenancy model.
 *
 * A lab may span classes, so a team has a SET of class ids, and two teams are
 * "same class" when those sets intersect.
 */

import { db } from '@/lib/db'
import type { LabType } from '@scienium/shared-types'
import { teamClassIds } from '@/lib/team/class-scope'

// Class scope itself lives in `lib/team/class-scope.ts` — phase progression asks
// the same question to decide whether a lab is teacher-paced. Re-exported so PvP
// call sites keep importing it from here.
export { teamClassIds }

/** Prisma filter: teams with at least one member in any of `classIds`. */
export function inClasses(classIds: string[]) {
  return { members: { some: { user: { classId: { in: classIds } } } } }
}

/** Whether two teams share at least one class — the raidability check. */
export async function sharesClass(
  teamA: string,
  teamB: string,
): Promise<boolean> {
  const [a, b] = await Promise.all([teamClassIds(teamA), teamClassIds(teamB)])
  if (a.length === 0 || b.length === 0) return false
  const set = new Set(a)
  return b.some((id) => set.has(id))
}

/**
 * Pick a random eligible opponent: same class, `working`+ phase, has a placed
 * base, never the attacker, never one already shown this session.
 */
export async function findRandomOpponent(
  ownTeamId: string,
  classIds: string[],
  shownBaseIds?: string[],
): Promise<{ id: string; name: string; labType: LabType | null } | null> {
  if (classIds.length === 0) return null

  const eligible = await db.team.findMany({
    where: {
      ...inClasses(classIds),
      id: { not: ownTeamId, notIn: shownBaseIds ?? [] },
      // PvP unlocks with the topic lock, so anyone from literature_review on is
      // a legitimate target — they have a lab type and can have a placed base.
      phase: { in: ['literature_review', 'working'] },
      shopBuildings: { some: { posX: { not: null } } },
    },
    select: { id: true, name: true, labType: true },
  })
  if (eligible.length === 0) return null
  return eligible[Math.floor(Math.random() * eligible.length)]
}

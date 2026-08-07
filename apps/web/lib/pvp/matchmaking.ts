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

/** Distinct class ids this team's members belong to (empty if none are enrolled). */
export async function teamClassIds(teamId: string): Promise<string[]> {
  // Read through `team.members`, the same traversal `teacherOwnsTeam` uses.
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
      phase: { in: ['working', 'showcase'] },
      shopBuildings: { some: { posX: { not: null } } },
    },
    select: { id: true, name: true, labType: true },
  })
  if (eligible.length === 0) return null
  return eligible[Math.floor(Math.random() * eligible.length)]
}

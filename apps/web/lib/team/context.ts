import 'server-only'
import type { LabType, ProjectPhase } from '@scienium/shared-types'
import { db } from '@/lib/db'
import { pickActiveTeam } from '@/lib/team/active-team'

// Re-exported so callers can keep importing the resolver from the team-context
// module; the implementation lives in the import-free active-team module so it
// stays unit-testable without loading Prisma.
export { pickActiveTeam }

export interface TeamContext {
  teamId: string
  phase: ProjectPhase
  labType: LabType | null
}

export interface ActiveTeamResolution {
  /** Internal `User.id` — the foreign key used by every owned row. */
  dbUserId: string
  team: { id: string; phase: ProjectPhase; labType: LabType | null }
}

/**
 * THE membership-backed active-team query — the single place the database is
 * asked "which team is this signed-in user acting as?". A stored
 * `activeTeamId` is trusted only while a `TeamMember` row still backs it (see
 * `pickActiveTeam`), so a stale or forged id can never widen access. Both the
 * API route guard (`requireTeamContext`) and the server-component resolver
 * (`getTeamContext`) go through here; do not duplicate this query.
 *
 * Returns null when there is no User row or no team (teacher or
 * not-yet-onboarded student).
 */
export async function resolveActiveTeam(clerkUserId: string): Promise<ActiveTeamResolution | null> {
  const user = await db.user.findUnique({
    where: { clerkUserId },
    select: {
      id: true,
      activeTeamId: true,
      teamMemberships: {
        orderBy: { joinedAt: 'desc' },
        select: { teamId: true, team: { select: { id: true, phase: true, labType: true } } },
      },
    },
  })
  if (!user) return null
  const team = pickActiveTeam(user.activeTeamId, user.teamMemberships)
  return team ? { dbUserId: user.id, team } : null
}

/**
 * Resolve the signed-in user's active team through membership. Returns null for
 * a team-less account (teacher or not-yet-onboarded student).
 */
export async function getTeamContext(clerkUserId: string): Promise<TeamContext | null> {
  const resolved = await resolveActiveTeam(clerkUserId)
  return resolved
    ? { teamId: resolved.team.id, phase: resolved.team.phase, labType: resolved.team.labType }
    : null
}

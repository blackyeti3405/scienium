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

/**
 * Resolve the signed-in user's active team through membership. Returns null for
 * a team-less account (teacher or not-yet-onboarded student).
 */
export async function getTeamContext(clerkUserId: string): Promise<TeamContext | null> {
  const user = await db.user.findUnique({
    where: { clerkUserId },
    select: {
      activeTeamId: true,
      teamMemberships: {
        orderBy: { joinedAt: 'desc' },
        select: { teamId: true, team: { select: { id: true, phase: true, labType: true } } },
      },
    },
  })
  if (!user) return null
  const team = pickActiveTeam(user.activeTeamId, user.teamMemberships)
  return team ? { teamId: team.id, phase: team.phase, labType: team.labType } : null
}
import type { LabType, ProjectPhase } from '@scienium/shared-types'
import { db } from '@/lib/db'

export interface TeamContext {
  teamId: string
  phase: ProjectPhase
  labType: LabType | null
}

/**
 * Resolve the explicit active team. The membership fallback preserves behavior
 * until the additive migration has backfilled existing users.
 */
export async function getTeamContext(clerkUserId: string): Promise<TeamContext | null> {
  const user = await db.user.findUnique({
    where: { clerkUserId },
    select: {
      activeTeam: { select: { id: true, phase: true, labType: true } },
      teamMemberships: {
        orderBy: { joinedAt: 'desc' },
        take: 1,
        select: { team: { select: { id: true, phase: true, labType: true } } },
      },
    },
  })

  const team = user?.activeTeam ?? user?.teamMemberships[0]?.team
  return team ? { teamId: team.id, phase: team.phase, labType: team.labType } : null
}

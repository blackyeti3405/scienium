import { NextResponse } from 'next/server'
import { withTeamRoute } from '@/lib/api/with-route'
import { db } from '@/lib/db'

/**
 * POST /api/team/unlock-ack — the student has seen the "BUILDING UNLOCKED"
 * ceremony for their current phase.
 *
 * Stamping the PHASE rather than a boolean is what makes this safe to call more
 * than once and still correct for later unlocks: acknowledging
 * `literature_review` says nothing about the ceremony owed at
 * `project_development`.
 *
 * Gated on `buildings` because that is what the ceremony points at, and it is
 * unlocked from day one — so this can never 403 a student out of dismissing an
 * overlay that is blocking their screen.
 */
export const POST = withTeamRoute(
  { tier: 'mutate', feature: 'buildings' },
  async ({ ctx }) => {
    await db.team.update({
      where: { id: ctx.teamId },
      data: { unlockAckPhase: ctx.phase },
    })
    return NextResponse.json({ ok: true, ackPhase: ctx.phase })
  },
)

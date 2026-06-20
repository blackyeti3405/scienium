import { NextRequest, NextResponse } from 'next/server'
import { requireTeamContext } from '@/lib/api/route-context'
import { getLiteratureAdvanceProgress } from '@/lib/team/advance'
import { db } from '@/lib/db'

/**
 * GET /api/team — everything the Team panel needs: roster, capacity, the lead's
 * active invite code, and (for the literature phase) the advance-readiness gate.
 */
export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'read' })
  if (error) return error

  const team = await db.team.findUnique({
    where: { id: ctx.teamId },
    select: {
      id: true,
      name: true,
      teamLeadId: true,
      maxMembers: true,
      members: {
        orderBy: { joinedAt: 'asc' },
        select: { userId: true, role: true, user: { select: { name: true } } },
      },
      invites: {
        where: { usedByUserId: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { code: true, expiresAt: true },
      },
    },
  })
  if (!team) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  const isLead = team.teamLeadId === ctx.dbUserId

  // Only the literature_review gate is implemented; other phases report no gate.
  const advance =
    ctx.phase === 'literature_review'
      ? await getLiteratureAdvanceProgress(team.id, ctx.phase)
      : null

  return NextResponse.json({
    teamId: team.id,
    name: team.name,
    phase: ctx.phase,
    maxMembers: team.maxMembers,
    memberCount: team.members.length,
    isLead,
    members: team.members.map((m) => ({
      name: m.user.name,
      role: m.role,
      isYou: m.userId === ctx.dbUserId,
    })),
    // The join code is sensitive to the team — only expose it to the lead.
    invite: isLead ? team.invites[0] ?? null : null,
    advance,
  })
}

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

  // One team query (the caller's classroom rides along on their own member row —
  // no separate user fetch) + the advance gate, launched together instead of as
  // a serial waterfall (PERF-3).
  const [team, advance] = await Promise.all([
    db.team.findUnique({
      where: { id: ctx.teamId },
      select: {
        id: true,
        name: true,
        teamLeadId: true,
        maxMembers: true,
        researchIdea: true,
        labType: true,
        members: {
          orderBy: { joinedAt: 'asc' },
          select: {
            userId: true,
            role: true,
            // `class` is only read off the caller's own row below — the lab
            // panel shows whether this lab is linked to a teacher.
            user: { select: { name: true, class: { select: { id: true, name: true } } } },
          },
        },
        invites: {
          where: { usedByUserId: null, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { code: true, expiresAt: true },
        },
      },
    }),
    // Only the literature_review gate is implemented; other phases report no gate.
    ctx.phase === 'literature_review'
      ? getLiteratureAdvanceProgress(ctx.teamId, ctx.phase)
      : Promise.resolve(null),
  ])
  if (!team) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  const isLead = team.teamLeadId === ctx.dbUserId

  // The caller's own classroom (if they've joined a teacher's class). Scoped to
  // self: read off the caller's membership row, never another member's.
  const myClass = team.members.find((m) => m.userId === ctx.dbUserId)?.user.class ?? null

  return NextResponse.json({
    teamId: team.id,
    name: team.name,
    phase: ctx.phase,
    maxMembers: team.maxMembers,
    memberCount: team.members.length,
    isLead,
    researchIdea: team.researchIdea ?? null,
    labType: team.labType ?? null,
    members: team.members.map((m) => ({
      name: m.user.name,
      role: m.role,
      isYou: m.userId === ctx.dbUserId,
    })),
    // The join code is sensitive to the team — only expose it to the lead.
    invite: isLead ? team.invites[0] ?? null : null,
    myClass,
    advance,
  })
}

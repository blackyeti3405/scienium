import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { withTeamRoute, RouteError } from '@/lib/api/with-route'
import { generateInviteCode, INVITE_TTL_DAYS } from '@/lib/team/invite'
import { recordSecurityEvent } from '@/lib/observability/security-event'
import { db } from '@/lib/db'

/**
 * POST /api/team/invite — the lead mints a single-use join code (Feature 1b).
 * Refuses when the lab is already at capacity, since there'd be no seat to fill.
 */
export const POST = withTeamRoute({ tier: 'mutate' }, async ({ ctx }) => {
  const team = await db.team.findUnique({
    where: { id: ctx.teamId },
    select: { teamLeadId: true, maxMembers: true, _count: { select: { members: true } } },
  })
  if (!team) throw new RouteError('No team found', 404)
  if (team.teamLeadId !== ctx.dbUserId) {
    throw new RouteError('Only the lab lead can invite members', 403)
  }
  if (team._count.members >= team.maxMembers) {
    throw new RouteError('Your lab is already full', 409)
  }

  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000)

  // Mint a fresh code; retry on the (vanishingly unlikely) unique-code collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateInviteCode()
    try {
      const invite = await db.teamInvite.create({
        data: { code, teamId: ctx.teamId, createdByUserId: ctx.dbUserId, expiresAt },
        select: { id: true, code: true, expiresAt: true },
      })
      // Who handed out access to this lab, and when (REFACTOR2 P1-5). The code
      // is a live credential and is never recorded — the invite's own id is.
      void recordSecurityEvent({
        kind: 'authority.join_code',
        outcome: 'ok',
        actorType: 'user',
        actorUserId: ctx.dbUserId,
        targetType: 'invite',
        targetId: invite.id,
        scopeId: ctx.teamId,
        reason: 'team_invite_minted',
        dedupeKey: `invite_minted:${invite.id}`,
      })
      return NextResponse.json({ invite: { code: invite.code, expiresAt: invite.expiresAt } })
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') continue
      throw err
    }
  }
  throw new RouteError('Could not generate a code, try again', 500)
})

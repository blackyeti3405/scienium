import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { withTeamRoute, ApiError } from '@/lib/api/with-route'
import { generateInviteCode, INVITE_TTL_DAYS } from '@/lib/team/invite'
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
  if (!team) throw new ApiError('No team found', 404)
  if (team.teamLeadId !== ctx.dbUserId) {
    throw new ApiError('Only the lab lead can invite members', 403)
  }
  if (team._count.members >= team.maxMembers) {
    throw new ApiError('Your lab is already full', 409)
  }

  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000)

  // Mint a fresh code; retry on the (vanishingly unlikely) unique-code collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateInviteCode()
    try {
      const invite = await db.teamInvite.create({
        data: { code, teamId: ctx.teamId, createdByUserId: ctx.dbUserId, expiresAt },
        select: { code: true, expiresAt: true },
      })
      return NextResponse.json({ invite })
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') continue
      throw err
    }
  }
  throw new ApiError('Could not generate a code, try again', 500)
})

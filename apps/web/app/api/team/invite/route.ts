import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { getTeamContext } from '@/lib/phase'
import { enforceRateLimit } from '@/lib/rate-limit'
import { generateInviteCode, INVITE_TTL_DAYS } from '@/lib/team/invite'
import { db } from '@/lib/db'

/**
 * POST /api/team/invite — the lead mints a single-use join code (Feature 1b).
 * Refuses when the lab is already at capacity, since there'd be no seat to fill.
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = enforceRateLimit(req, 'mutate', userId)
  if (limited) return limited

  const dbUser = await db.user.findUnique({ where: { clerkUserId: userId }, select: { id: true } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  const team = await db.team.findUnique({
    where: { id: ctx.teamId },
    select: { teamLeadId: true, maxMembers: true, _count: { select: { members: true } } },
  })
  if (!team) return NextResponse.json({ error: 'No team found' }, { status: 404 })
  if (team.teamLeadId !== dbUser.id) {
    return NextResponse.json({ error: 'Only the lab lead can invite members' }, { status: 403 })
  }
  if (team._count.members >= team.maxMembers) {
    return NextResponse.json({ error: 'Your lab is already full' }, { status: 409 })
  }

  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000)

  // Mint a fresh code; retry on the (vanishingly unlikely) unique-code collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateInviteCode()
    try {
      const invite = await db.teamInvite.create({
        data: { code, teamId: ctx.teamId, createdByUserId: dbUser.id, expiresAt },
        select: { code: true, expiresAt: true },
      })
      return NextResponse.json({ invite })
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') continue
      throw err
    }
  }
  return NextResponse.json({ error: 'Could not generate a code, try again' }, { status: 500 })
}

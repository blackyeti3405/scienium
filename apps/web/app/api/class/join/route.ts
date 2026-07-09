import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { enforceRateLimit } from '@/lib/rate-limit'
import { parseJson } from '@/lib/validation'
import { resolveClass, enrollTeamInClass } from '@/lib/onboarding/profile'
import { db } from '@/lib/db'

const JoinClassBody = z
  .object({ code: z.string().trim().min(1, 'A class code is required').max(32) })
  .strict()

/**
 * POST /api/class/join — a student joins (or switches into) a teacher's
 * classroom with its reusable join code, any time after onboarding. Sets the
 * user's `classId` and adopts the class's school so the teacher roster is
 * consistent. Tight `join` rate-limit to blunt code guessing.
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = await enforceRateLimit(req, 'join', userId)
  if (limited) return limited

  const { data, error } = await parseJson(req, JoinClassBody)
  if (error) return error

  const user = await db.user.findUnique({ where: { clerkUserId: userId }, select: { id: true } })
  if (!user) return NextResponse.json({ error: 'Complete onboarding first' }, { status: 404 })

  const match = await resolveClass(data.code)
  if (!match) return NextResponse.json({ error: 'That class code is not valid' }, { status: 404 })

  const memberships = await db.teamMember.findMany({
    where: { userId: user.id },
    select: { role: true, team: { select: { id: true, classId: true } } },
  })
  const conflictingMemberTeam = memberships.find(
    ({ role, team }) =>
      role !== 'lead' && team.classId !== null && team.classId !== match.classId,
  )
  if (conflictingMemberTeam) {
    return NextResponse.json(
      { error: 'Your lab lead must move the whole lab into this class.' },
      { status: 409 },
    )
  }

  const klass = await db.$transaction(async (tx) => {
    const target = await tx.class.findUniqueOrThrow({
      where: { id: match.classId },
      select: { id: true, name: true, schoolId: true },
    })
    await tx.user.update({
      where: { id: user.id },
      data: { classId: target.id, schoolId: target.schoolId },
    })
    for (const { role, team } of memberships) {
      if (role === 'lead') {
        await enrollTeamInClass(team.id, target.id, target.schoolId, tx)
      }
    }
    return target
  })

  return NextResponse.json({ classId: klass.id, className: klass.name })
}

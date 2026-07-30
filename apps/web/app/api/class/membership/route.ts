import { NextRequest, NextResponse } from 'next/server'
import { requireUserContext } from '@/lib/api/route-context'
import { leaveClass } from '@/lib/onboarding/class-membership'
import { db } from '@/lib/db'

/**
 * DELETE /api/class/membership — the student leaves their class.
 *
 * The student-side half of the class lifecycle (REFACTOR2 P1-R8). Until this
 * existed there was no way out of a class at all: a student could only be moved
 * by being approved into a different one, so a wrong-class enrolment — and the
 * teacher visibility it grants — was permanent from the student's side.
 *
 * Scoped to the caller by construction: the command takes no class id, it ends
 * whatever enrolment the caller has. Leaving clears `User.classId`, which is
 * what `teacherOwnsTeam` reads, so the teacher's access ends with it.
 */
export async function DELETE(req: NextRequest) {
  const { ctx, error } = await requireUserContext(req, { tier: 'mutate' })
  if (error) return error

  const user = await db.user.findUnique({
    where: { clerkUserId: ctx.userId },
    select: { id: true },
  })
  if (!user) return NextResponse.json({ error: 'Complete onboarding first' }, { status: 404 })

  const outcome = await leaveClass(user.id)
  if (!outcome.committed) {
    return NextResponse.json({ error: 'You are not in a class' }, { status: 409 })
  }

  return NextResponse.json({ ok: true, classId: outcome.classId })
}

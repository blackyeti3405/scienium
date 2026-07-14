import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUserContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { resolveClass, requestClassJoin } from '@/lib/onboarding/profile'
import { db } from '@/lib/db'

const JoinClassBody = z
  .object({ code: z.string().trim().min(1, 'A class code is required').max(32) })
  .strict()

/**
 * POST /api/class/join — a student REQUESTS to join a teacher's classroom with
 * its reusable join code, any time after onboarding. This no longer enrolls
 * directly: it files a pending `ClassJoinRequest` the teacher must approve, so a
 * leaked code can't silently populate a roster. Tight `join` rate-limit to blunt
 * code guessing.
 *
 * Returns `{ status: 'pending', className }` for a new/re-opened request, or
 * `{ status: 'approved', classId, className }` when the student is already in
 * that class (idempotent no-op).
 */
export async function POST(req: NextRequest) {
  const { ctx, error: guardError } = await requireUserContext(req, { tier: 'join' })
  if (guardError) return guardError
  const { userId } = ctx

  const { data, error } = await parseJson(req, JoinClassBody)
  if (error) return error

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: { id: true, classId: true },
  })
  if (!user) return NextResponse.json({ error: 'Complete onboarding first' }, { status: 404 })

  const match = await resolveClass(data.code)
  if (!match) return NextResponse.json({ error: 'That class code is not valid' }, { status: 404 })

  const target = await db.class.findUniqueOrThrow({
    where: { id: match.classId },
    select: { id: true, name: true },
  })

  // Already in this class → idempotent success, no new request.
  if (user.classId === target.id) {
    return NextResponse.json({ status: 'approved', classId: target.id, className: target.name })
  }

  // Class membership is per-student, so any student can request their own
  // teacher's class regardless of what class(es) their teammates are in — a lab
  // can span classes/schools with each member in their respective class.
  await requestClassJoin(user.id, target.id)
  return NextResponse.json({ status: 'pending', className: target.name })
}

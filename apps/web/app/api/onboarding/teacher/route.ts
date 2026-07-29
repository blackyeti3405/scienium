import { currentUser, clerkClient } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireUserContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'
import { recordSecurityEvent } from '@/lib/observability/security-event'
import { resolvePrimaryEmail, resolveSchool, syncClerkDisplayName } from '@/lib/onboarding/profile'

// `.strict()` rejects any field other than name + highSchool — role and userId
// must never come from the body; the caller's identity comes from auth() only.
const TeacherOnboardingBody = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(80),
    highSchool: z.string().trim().max(120).optional(),
  })
  .strict()

export async function POST(req: NextRequest) {
  const { ctx, error: guardError } = await requireUserContext(req, { tier: 'mutate' })
  if (guardError) return guardError
  const { userId } = ctx

  const clerkUser = await currentUser()
  if (!clerkUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await parseJson(req, TeacherOnboardingBody)
  if (error) return error
  const { name, highSchool } = data

  // Resolve email — primary first, fallback to index 0.
  const email = resolvePrimaryEmail(clerkUser)

  if (!email) return NextResponse.json({ error: 'No email on Clerk account' }, { status: 400 })

  // No student → teacher upgrade after onboarding. Choosing "teacher" on a fresh
  // account is fine, but once a User row exists (they already onboarded as a
  // student) we refuse to flip the role — and the gate is here on the server, not
  // the UI. An already-teacher row passes through idempotently.
  const existing = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: { id: true, role: true },
  })
  if (existing && existing.role !== 'teacher') {
    return NextResponse.json(
      {
        error:
          'This account is already set up as a student. Teacher accounts must be created on a separate account.',
      },
      { status: 409 },
    )
  }

  // Create the teacher's User row on first signup, or reuse an existing teacher
  // row on an idempotent re-submit. clerkUserId comes from auth(), never the body.
  const user =
    existing ??
    (await db.user.create({
      data: { clerkUserId: userId, name, email, role: 'teacher' },
    }))

  // On a fresh teacher signup, mirror the typed name into Clerk so the avatar matches.
  if (!existing) await syncClerkDisplayName(userId, name)

  // Attach school when provided — non-fatal so a hiccup doesn't block role
  // assignment (matches the posture of /api/onboarding).
  if (highSchool?.trim()) {
    await resolveSchool(highSchool)
      .then((schoolId) => {
        if (schoolId) return db.user.update({ where: { id: user.id }, data: { schoolId } })
      })
      .catch(() => {})
  }

  // Set Clerk publicMetadata.role on the CALLER only (userId from auth()).
  // clerkClient is async in Clerk v5 — must be called before .users access.
  const cc = await clerkClient()
  await cc.users.updateUserMetadata(userId, { publicMetadata: { role: 'teacher' } })

  // The largest privilege grant in the app, recorded durably (REFACTOR2 P1-5):
  // a teacher can read every student's individual work in their classes.
  // `dedupeKey` is the user id, so the idempotent re-submit this route
  // deliberately allows appends exactly one row however many times it is called.
  await recordSecurityEvent({
    kind: 'provision.teacher_role',
    outcome: 'ok',
    actorType: 'teacher',
    actorUserId: user.id,
    targetType: 'user',
    targetId: user.id,
    reason: 'teacher_onboarding',
    dedupeKey: `teacher_role:${user.id}`,
  })

  return NextResponse.json({ ok: true })
}

import 'server-only'
import { clerkClient } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { normalizeInviteCode } from '@/lib/team/invite'

/**
 * School + classroom resolution shared by every path that creates a User row
 * (create-a-lab onboarding, join-a-lab, and the standalone class-join route), so
 * the rules live in exactly one place.
 *
 * A school is created on demand by name (`School.name` is unique → upsert). A
 * classroom is matched by its reusable join code; when a student joins via a
 * class code the class's school wins over any typed school name, keeping a
 * roster consistent for the teacher.
 */

/** Find-or-create a School by name. Returns the school id, or null for blank. */
export async function resolveSchool(name: string | null | undefined): Promise<string | null> {
  const trimmed = name?.trim()
  if (!trimmed) return null
  const school = await db.school.upsert({
    where: { name: trimmed },
    update: {},
    create: { name: trimmed },
  })
  return school.id
}

export interface ClassMatch {
  classId: string
  schoolId: string
}

/**
 * Resolve a classroom by its join code, or null if the code matches nothing.
 * Expired codes resolve null too (SEC2-003) — indistinguishable from an
 * invalid code by design (generic response; no oracle for probing), and a
 * code without an expiry fails CLOSED (every mint sets one; a null can only
 * mean pre-migration drift).
 */
export async function resolveClass(code: string | null | undefined): Promise<ClassMatch | null> {
  const trimmed = code?.trim()
  if (!trimmed) return null
  const klass = await db.class.findUnique({
    where: { joinCode: normalizeInviteCode(trimmed) },
    select: { id: true, schoolId: true, joinCodeExpiresAt: true },
  })
  if (!klass) return null
  if (!klass.joinCodeExpiresAt || klass.joinCodeExpiresAt <= new Date()) return null
  return { classId: klass.id, schoolId: klass.schoolId }
}

/**
 * Assign a user's school from their typed high-school name, and — when a class
 * code matches — file a PENDING class-join request instead of enrolling directly
 * (the teacher must approve; see `requestClassJoin`). No-ops silently when
 * neither is provided so it's safe to call unconditionally.
 *
 * Class membership is per-student: entering a code never changes the student's
 * own school (they keep the one they typed) — the class's school is applied only
 * on approval. `classId` in the return is always null (enrollment happens on
 * approval); `pendingClassId` reports the class a request was filed against.
 */
export async function applySchoolAndClass(
  dbUserId: string,
  opts: { highSchool?: string | null; classCode?: string | null },
): Promise<{ classId: null; pendingClassId: string | null }> {
  const schoolId = await resolveSchool(opts.highSchool)
  if (schoolId) {
    await db.user.update({ where: { id: dbUserId }, data: { schoolId } })
  }

  const classMatch = await resolveClass(opts.classCode)
  const pendingClassId = classMatch ? await requestClassJoin(dbUserId, classMatch.classId) : null
  return { classId: null, pendingClassId }
}

/**
 * File (or refresh) a student's PENDING request to join a class. Returns the
 * classId when a request is now pending, or null when no request was needed
 * because the student is already enrolled in that class.
 *
 * - Already in the class → no-op (returns null).
 * - Existing approved/denied/pending row → reset to `pending` (a re-request after
 *   a denial, or a fresh code entry, re-opens it for the teacher).
 */
export async function requestClassJoin(
  dbUserId: string,
  classId: string,
): Promise<string | null> {
  const user = await db.user.findUnique({ where: { id: dbUserId }, select: { classId: true } })
  if (user?.classId === classId) return null // already enrolled — nothing to request

  await db.classJoinRequest.upsert({
    where: { classId_userId: { classId, userId: dbUserId } },
    create: { classId, userId: dbUserId, status: 'pending' },
    update: { status: 'pending', decidedAt: null, decidedByUserId: null },
  })
  return classId
}

/**
 * Approve a pending class-join request: enroll ONLY the requesting student into
 * the class (set their `classId` + adopt the class's school). Class membership is
 * per-student — a lab can span multiple classes/schools, so approval never
 * touches teammates or the team row. Caller must have already verified the
 * request belongs to a class this teacher owns.
 */
export async function approveClassJoin(
  requestId: string,
  decidedByUserId: string,
): Promise<void> {
  await db.$transaction(async (tx) => {
    const request = await tx.classJoinRequest.findUnique({
      where: { id: requestId },
      select: { id: true, classId: true, userId: true, status: true },
    })
    if (!request || request.status !== 'pending') return

    const klass = await tx.class.findUniqueOrThrow({
      where: { id: request.classId },
      select: { id: true, schoolId: true },
    })

    await tx.user.update({
      where: { id: request.userId },
      data: { classId: klass.id, schoolId: klass.schoolId },
    })
    await tx.classJoinRequest.update({
      where: { id: request.id },
      data: { status: 'approved', decidedAt: new Date(), decidedByUserId },
    })
  })
}

/**
 * Dev-only default high school. The pilot's dev account (Santa Clara High School)
 * is pre-filled so local onboarding/teacher flows have a real school without
 * manual entry. Inert in production.
 */
export const DEV_DEFAULT_HIGH_SCHOOL =
  process.env.NODE_ENV !== 'production' ? 'Santa Clara High School' : ''

/**
 * Mirror a user's display name into their Clerk profile (first/last name) so the
 * Clerk-managed avatar/account stay consistent with our DB `User.name`. Splits on
 * the first space. Best-effort: a Clerk hiccup must never fail the caller's primary
 * write, so failures are logged, not thrown. Shared by settings + every onboarding
 * path so the names never drift.
 */
export async function syncClerkDisplayName(clerkUserId: string, name: string): Promise<void> {
  const trimmed = name.trim()
  if (!trimmed) return
  const sp = trimmed.indexOf(' ')
  const firstName = sp === -1 ? trimmed : trimmed.slice(0, sp)
  const lastName = sp === -1 ? '' : trimmed.slice(sp + 1)
  try {
    const cc = await clerkClient()
    await cc.users.updateUser(clerkUserId, { firstName, lastName })
  } catch (err) {
    console.error('[profile] failed to sync display name to Clerk:', err)
  }
}
import 'server-only'
import { clerkClient, currentUser } from '@clerk/nextjs/server'
import type { ClassJoinRequestStatus } from '@prisma/client'
import { db } from '@/lib/db'
import { lockAggregate } from '@/lib/db-lock'
import { normalizeInviteCode } from '@/lib/team/invite'
import { recordClassEvent } from '@/lib/onboarding/class-membership'

type ClerkUser = Awaited<ReturnType<typeof currentUser>>

/**
 * Resolve a Clerk user's email: their primary address, falling back to the
 * first address on the account. Shared by every path that mints a `User` row
 * from a Clerk identity (create-a-lab onboarding, teacher onboarding, join-a-lab,
 * and the teacher guard's on-demand row creation), so the fallback rule lives
 * in exactly one place.
 */
export function resolvePrimaryEmail(clerkUser: ClerkUser | null | undefined): string | undefined {
  return (
    clerkUser?.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ??
    clerkUser?.emailAddresses[0]?.emailAddress
  )
}

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
 * When a class code matches, file a PENDING class-join request rather than
 * enrolling directly (the teacher must approve; see `requestClassJoin`). No-ops
 * silently without a code, so it's safe to call unconditionally.
 *
 * Students no longer supply a school. `User.schoolId` was only ever read by the
 * `school_only` showcase tier, which was withdrawn as forgeable (a self-asserted
 * name proved nothing) — so the field was identifying data on a minor with no
 * consumer. A student's school is now set solely by a teacher APPROVING their
 * class join, which is a verified affiliation rather than a typed string.
 *
 * `classId` in the return is always null (enrollment happens on approval);
 * `pendingClassId` reports the class a request was filed against.
 */
export async function applyClassCode(
  dbUserId: string,
  opts: { classCode?: string | null },
): Promise<{ classId: null; pendingClassId: string | null }> {
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

  // The upsert RESETS `decidedAt`/`decidedByUserId`, so the request row cannot
  // carry history — which is why the event log exists (P1-R8, class half).
  await db.$transaction(async (tx) => {
    await tx.classJoinRequest.upsert({
      where: { classId_userId: { classId, userId: dbUserId } },
      create: { classId, userId: dbUserId, status: 'pending' },
      update: { status: 'pending', decidedAt: null, decidedByUserId: null },
    })
    await recordClassEvent(tx, {
      classId,
      userId: dbUserId,
      event: 'requested',
      actorUserId: dbUserId,
    })
  })
  return classId
}

/** What a class-join decision actually committed. */
export type ClassDecisionOutcome =
  | { committed: true; decision: 'approve' | 'deny' }
  /** Someone already decided this request; `status` is the state that stands. */
  | { committed: false; status: ClassJoinRequestStatus }

/**
 * Decide a class-join request — the ONE path for both approve and deny (P1-S2).
 *
 * The old split had contradictory terminal states. The route pre-read
 * `status: 'pending'` and then acted on that stale snapshot: approval re-read
 * inside its transaction and returned silently when the row had moved on (while
 * the route still answered `{ ok: true }`), and denial wrote **unconditionally**
 * with no status predicate. Approve-then-deny therefore left the student
 * enrolled — `User.classId` set — against a request marked `denied`.
 *
 * Everything now hangs off one compare-and-set:
 *
 *   - the transition is `updateMany` predicated on `status: 'pending'`, so only
 *     the first decision commits and the loser learns what actually stands;
 *   - approval takes a per-student lock before touching `User.classId`, so two
 *     teachers approving into different classes serialize instead of racing to
 *     last-writer-wins;
 *   - any other approved request for that student is marked `superseded`, so the
 *     database never holds two `approved` rows describing one `classId`.
 *
 * Denial deliberately does NOT un-enrol an already-approved student: that is a
 * class-removal command, which belongs to the membership lifecycle still open as
 * P1-R8. Refusing the stale decision is the honest answer here.
 *
 * The caller must have already verified the request belongs to a class this
 * teacher owns.
 */
export async function decideClassJoin(
  requestId: string,
  decidedByUserId: string,
  decision: 'approve' | 'deny',
): Promise<ClassDecisionOutcome> {
  return db.$transaction(async (tx) => {
    const request = await tx.classJoinRequest.findUnique({
      where: { id: requestId },
      select: { id: true, classId: true, userId: true, status: true },
    })
    if (!request) return { committed: false, status: 'denied' as ClassJoinRequestStatus }

    // Serialize competing decisions about THIS student's single class slot.
    await lockAggregate(tx, `class-membership:${request.userId}`)

    const applied = await tx.classJoinRequest.updateMany({
      where: { id: requestId, status: 'pending' },
      data: {
        status: decision === 'approve' ? 'approved' : 'denied',
        decidedAt: new Date(),
        decidedByUserId,
      },
    })
    if (applied.count !== 1) {
      // Lost the race (or the row was never pending). Report what stands rather
      // than claiming success for a write that did not happen.
      const fresh = await tx.classJoinRequest.findUnique({
        where: { id: requestId },
        select: { status: true },
      })
      return { committed: false, status: fresh?.status ?? request.status }
    }

    if (decision === 'approve') {
      const klass = await tx.class.findUniqueOrThrow({
        where: { id: request.classId },
        select: { id: true, schoolId: true },
      })

      // Class membership is per-student (ADR-004): approval enrols ONLY the
      // requester, never teammates or the team row.
      await tx.user.update({
        where: { id: request.userId },
        data: { classId: klass.id, schoolId: klass.schoolId },
      })

      // `User.classId` holds one class, so a prior approval elsewhere no longer
      // describes reality. Mark it superseded — not denied; no teacher refused it.
      const displaced = await tx.classJoinRequest.findMany({
        where: { userId: request.userId, status: 'approved', id: { not: requestId } },
        select: { classId: true },
      })
      await tx.classJoinRequest.updateMany({
        where: { userId: request.userId, status: 'approved', id: { not: requestId } },
        data: { status: 'superseded', decidedAt: new Date(), decidedByUserId },
      })
      // Each displaced enrolment ENDED — and an authorization that ended with no
      // record of ending is exactly what P1-R8 is about. Null actor: the system
      // displaced it, no teacher chose to.
      for (const prior of displaced) {
        await recordClassEvent(tx, {
          classId: prior.classId,
          userId: request.userId,
          event: 'superseded',
          actorUserId: null,
          reason: 'approved_into_another_class',
        })
      }
    }

    await recordClassEvent(tx, {
      classId: request.classId,
      userId: request.userId,
      event: decision === 'approve' ? 'approved' : 'denied',
      actorUserId: decidedByUserId,
    })

    return { committed: true, decision }
  })
}

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
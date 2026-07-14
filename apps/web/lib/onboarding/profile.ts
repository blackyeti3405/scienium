import 'server-only'
import { clerkClient } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { normalizeInviteCode } from '@/lib/team/invite'
import type { Prisma } from '@prisma/client'

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

/** Resolve a classroom by its join code, or null if the code matches nothing. */
export async function resolveClass(code: string | null | undefined): Promise<ClassMatch | null> {
  const trimmed = code?.trim()
  if (!trimmed) return null
  const klass = await db.class.findUnique({
    where: { joinCode: normalizeInviteCode(trimmed) },
    select: { id: true, schoolId: true },
  })
  return klass ? { classId: klass.id, schoolId: klass.schoolId } : null
}

/**
 * Assign a user's school from a typed high-school name and/or a class join code,
 * and — when a class code matches — file a PENDING class-join request instead of
 * enrolling directly (the teacher must approve; see `requestClassJoin`). A valid
 * class code takes precedence for the school. No-ops silently when neither is
 * provided so it's safe to call unconditionally.
 *
 * `classId` in the return is always null now: enrollment only happens on teacher
 * approval, so callers that stamp a new team's class from this (onboarding) start
 * class-less until the request is approved. `pendingClassId` reports the class a
 * request was filed against, if any.
 */
export async function applySchoolAndClass(
  dbUserId: string,
  opts: { highSchool?: string | null; classCode?: string | null },
): Promise<{ classId: null; pendingClassId: string | null }> {
  const classMatch = await resolveClass(opts.classCode)
  const schoolId = classMatch?.schoolId ?? (await resolveSchool(opts.highSchool))

  // Adopt the school immediately (harmless — the roster is class-scoped, not
  // school-scoped, so this never surfaces the student before approval).
  if (schoolId) {
    await db.user.update({ where: { id: dbUserId }, data: { schoolId } })
  }

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
 * Approve a pending class-join request: enroll the student (and, if they lead any
 * labs, the whole lab) into the class, exactly as the old direct-join did. Runs in
 * one transaction. Any other pending requests by now-enrolled lab members for this
 * same class are resolved to `approved` too, so the teacher's queue stays clean.
 * Caller must have already verified the request belongs to a class this teacher owns.
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

    // Enroll the student themselves.
    await tx.user.update({
      where: { id: request.userId },
      data: { classId: klass.id, schoolId: klass.schoolId },
    })

    // If they lead any labs, move the whole lab in (a lab can't straddle classes),
    // collecting every member the enrollment moved so their own pending requests
    // for this class can be resolved in one sweep.
    const ledTeams = await tx.team.findMany({
      where: { teamLeadId: request.userId },
      select: { id: true },
    })
    const enrolledUserIds = new Set<string>([request.userId])
    for (const team of ledTeams) {
      await enrollTeamInClass(team.id, klass.id, klass.schoolId, tx)
      const members = await tx.teamMember.findMany({
        where: { teamId: team.id },
        select: { userId: true },
      })
      for (const m of members) enrolledUserIds.add(m.userId)
    }

    // Approve this request plus any now-satisfied pending requests for the same
    // class from the lab members the enrollment just moved in.
    await tx.classJoinRequest.updateMany({
      where: {
        classId: klass.id,
        status: 'pending',
        userId: { in: [...enrolledUserIds] },
      },
      data: { status: 'approved', decidedAt: new Date(), decidedByUserId },
    })
  })
}

/**
 * The classroom a lab belongs to — its lead's class. A lab is "in" a teacher's
 * class through its lead, so the lead's class (and school) defines the whole
 * lab's class. Returns null when the lead hasn't joined a class.
 */
export async function teamLeadClass(
  teamId: string,
): Promise<{ classId: string; schoolId: string } | null> {
  const team = await db.team.findUnique({
    where: { id: teamId },
    select: {
      class: { select: { id: true, schoolId: true } },
      teamLead: { select: { classId: true, schoolId: true } },
    },
  })
  const classId = team?.class?.id ?? team?.teamLead.classId
  const schoolId = team?.class?.schoolId ?? team?.teamLead.schoolId
  return classId && schoolId ? { classId, schoolId } : null
}

/**
 * Enroll a whole lab into a classroom: copy the class + school onto every team
 * member, so a lab can never straddle teacher authorization boundaries. Returns
 * the number of members enrolled or moved.
 */
export async function enrollTeamInClass(
  teamId: string,
  classId: string,
  schoolId: string,
  client: Pick<Prisma.TransactionClient, 'team' | 'user'> = db,
): Promise<number> {
  await client.team.update({ where: { id: teamId }, data: { classId } })
  const { count } = await client.user.updateMany({
    where: { teamMemberships: { some: { teamId } } },
    data: { classId, schoolId },
  })
  return count
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
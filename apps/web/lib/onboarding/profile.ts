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
 * Assign a user's school and (optionally) classroom from a typed high-school name
 * and/or a class join code. A valid class code takes precedence for the school.
 * No-ops silently when neither is provided so it's safe to call unconditionally.
 * Returns the matched class id (if any) so callers can report it.
 */
export async function applySchoolAndClass(
  dbUserId: string,
  opts: { highSchool?: string | null; classCode?: string | null },
): Promise<{ classId: string | null }> {
  const classMatch = await resolveClass(opts.classCode)
  const schoolId = classMatch?.schoolId ?? (await resolveSchool(opts.highSchool))

  if (!schoolId && !classMatch) return { classId: null }

  await db.user.update({
    where: { id: dbUserId },
    data: {
      ...(schoolId ? { schoolId } : {}),
      ...(classMatch ? { classId: classMatch.classId } : {}),
    },
  })
  return { classId: classMatch?.classId ?? null }
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

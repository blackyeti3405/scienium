import 'server-only'
import { auth, currentUser } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { resolveAuthoritativeRole } from '@/lib/teacher/role'
import { enforceRateLimit, type TierName } from '@/lib/rate-limit'
import { assertSameOrigin } from '@/lib/api/route-context'

// Re-exported so the role decision has one public home on the teacher guard; the
// implementation lives in the import-free role module so it stays unit-testable.
export { resolveAuthoritativeRole }

/**
 * Teacher authorization + class scoping — the highest-risk new surface, so the
 * checks live in one guard rather than being re-derived per route.
 *
 * Two layers of defense:
 *   1. ROLE — the caller must be teacher|admin. The DB `User.role` is
 *      authoritative whenever a row exists, so a stale Clerk `metadata.role`
 *      claim can never override a DB downgrade. The claim only bootstraps a
 *      brand-new account that has no row yet. Never client-gated alone.
 *   2. SCOPE — every data query is constrained to the classes this teacher owns
 *      (`Class.teacherId`). A teacher must never read another class's students,
 *      so callers filter by `ctx.classIds` and verify ownership before returning
 *      any team/student data.
 *
 * The teacher's `User` row is ensured on first use (a teacher may never have run
 * student onboarding) so `Class.teacherId` always resolves.
 */

export interface TeacherContext {
  /** Clerk user id. */
  userId: string
  /** Internal `User.id` — the `Class.teacherId` owner key. */
  dbUserId: string
  /** Class ids this teacher owns; the scope for every roster/validation query. */
  classIds: string[]
  role: 'teacher' | 'admin'
}

export type TeacherGuard =
  | { ctx: TeacherContext; error: null }
  | { ctx: null; error: NextResponse }

function roleFromClaims(sessionClaims: unknown): string | undefined {
  return (sessionClaims as { metadata?: { role?: string } } | null)?.metadata?.role
}

export async function requireTeacher(
  req: NextRequest,
  opts: { tier: TierName },
): Promise<TeacherGuard> {
  const { userId, sessionClaims } = await auth()
  if (!userId) {
    return { ctx: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const limited = await enforceRateLimit(req, opts.tier, userId)
  if (limited) return { ctx: null, error: limited }

  // CSRF: mutating teacher routes are cookie-authenticated too (SEC-11).
  const crossOrigin = assertSameOrigin(req)
  if (crossOrigin) return { ctx: null, error: crossOrigin }

  // Role: the DB is the source of truth. For an existing row we ignore the claim
  // entirely, so a downgraded teacher whose token still says "teacher" is denied.
  // The claim only bootstraps a claim-only teacher who has no row yet.
  const claimRole = roleFromClaims(sessionClaims)
  let user = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: { id: true, role: true },
  })
  const role = resolveAuthoritativeRole(user?.role, claimRole, !!user)
  if (!role) {
    return { ctx: null, error: NextResponse.json({ error: 'Teacher access required' }, { status: 403 }) }
  }

  // Ensure a User row backs this teacher (a claim-only teacher may have no row yet).
  if (!user) {
    const clerkUser = await currentUser()
    const email =
      clerkUser?.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ??
      clerkUser?.emailAddresses[0]?.emailAddress
    if (!email) {
      return { ctx: null, error: NextResponse.json({ error: 'No email on account' }, { status: 400 }) }
    }
    user = await db.user.create({
      data: {
        clerkUserId: userId,
        name: clerkUser?.firstName ?? 'Teacher',
        email,
        role,
      },
      select: { id: true, role: true },
    })
  }

  const classes = await db.class.findMany({ where: { teacherId: user.id }, select: { id: true } })

  return {
    ctx: { userId, dbUserId: user.id, classIds: classes.map((c) => c.id), role },
    error: null,
  }
}

/**
 * Verify a team falls within the teacher's scope through its MEMBERS: a teacher
 * owns a team if at least one of its members is in one of the teacher's classes.
 *
 * Class membership is per-student (a lab can span multiple schools/classes — each
 * student in their own class), so ownership can't be read off a single
 * `Team.classId`. A team's shared artifacts (rubric, feedback, nudges, papers,
 * showcase) are visible to EVERY teacher who owns ≥1 member; a student's
 * INDIVIDUAL pages stay gated on that student's own class in the per-student
 * routes (`student/[id]…`), so a teammate's teacher can't open them. An empty
 * class scope is never in-scope.
 */
export async function teacherOwnsTeam(classIds: string[], teamId: string): Promise<boolean> {
  if (classIds.length === 0) return false
  const team = await db.team.findFirst({
    where: { id: teamId, members: { some: { user: { classId: { in: classIds } } } } },
    select: { id: true },
  })
  return !!team
}

/**
 * Server-component teacher check with the same DB-authoritative rule as
 * requireTeacher: an existing `User.role` wins over any claim (so a downgrade
 * takes effect immediately); the claim only bootstraps an account with no row.
 */
export async function resolveTeacherRole(
  userId: string,
  sessionClaims: unknown,
): Promise<'teacher' | 'admin' | null> {
  const u = await db.user.findUnique({ where: { clerkUserId: userId }, select: { role: true } })
  return resolveAuthoritativeRole(u?.role, roleFromClaims(sessionClaims), !!u)
}
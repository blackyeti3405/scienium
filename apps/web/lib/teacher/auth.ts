import { auth, currentUser } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { enforceRateLimit, type TierName } from '@/lib/rate-limit'

/**
 * Teacher authorization + class scoping — the highest-risk new surface, so the
 * checks live in one guard rather than being re-derived per route.
 *
 * Two layers of defense:
 *   1. ROLE — the Clerk session must carry `metadata.role` of teacher|admin
 *      (mirrors `(teacher)/layout.tsx`). Client gating is never the sole gate.
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

  const role = roleFromClaims(sessionClaims)
  if (role !== 'teacher' && role !== 'admin') {
    return { ctx: null, error: NextResponse.json({ error: 'Teacher access required' }, { status: 403 }) }
  }

  const limited = await enforceRateLimit(req, opts.tier, userId)
  if (limited) return { ctx: null, error: limited }

  // Ensure a User row backs this teacher (they may never have onboarded).
  let user = await db.user.findUnique({ where: { clerkUserId: userId }, select: { id: true } })
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
        role: role as 'teacher' | 'admin',
      },
      select: { id: true },
    })
  }

  const classes = await db.class.findMany({ where: { teacherId: user.id }, select: { id: true } })

  return {
    ctx: { userId, dbUserId: user.id, classIds: classes.map((c) => c.id), role: role as 'teacher' | 'admin' },
    error: null,
  }
}

/**
 * Verify a team falls within the teacher's scope: at least one member is a
 * student in one of the teacher's classes. Returns true if the teacher may view
 * or act on the team. An empty class scope is never in-scope.
 */
export async function teacherOwnsTeam(classIds: string[], teamId: string): Promise<boolean> {
  if (classIds.length === 0) return false
  const member = await db.teamMember.findFirst({
    where: { teamId, user: { classId: { in: classIds } } },
    select: { userId: true },
  })
  return !!member
}

/** Server-component role check (mirrors requireTeacher's role layer). */
export function teacherRole(sessionClaims: unknown): 'teacher' | 'admin' | null {
  const role = roleFromClaims(sessionClaims)
  return role === 'teacher' || role === 'admin' ? role : null
}

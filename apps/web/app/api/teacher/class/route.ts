import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacher } from '@/lib/teacher/auth'
import { parseJson } from '@/lib/validation'
import { resolveSchool } from '@/lib/onboarding/profile'
import { classJoinCodeExpiry, generateInviteCode } from '@/lib/team/invite'
import { recordSecurityEvent } from '@/lib/observability/security-event'
import { db } from '@/lib/db'

/**
 * Cap on pending join requests returned per class (§0.7: "responses are
 * unbounded"). Unlike the roster's per-teacher student list — bounded in
 * practice by real classroom enrollment, a teacher's own students — a class's
 * join code is semi-public until revoked, so the pending-request count is
 * bounded only by how many accounts try it before a teacher notices and
 * regenerates it (SEC2-003). `@@unique([classId, userId])` already caps one
 * user to one row, but distinct accounts are not capped at all. Ordered
 * oldest-first, so a teacher still sees (and can act on) the longest-waiting
 * requests first if a class is ever at the cap.
 */
const MAX_PENDING_REQUESTS_PER_CLASS = 500

/**
 * GET /api/teacher/class — the teacher's classrooms, their reusable join codes,
 * and each class's PENDING join requests (students awaiting approval).
 */
export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeacher(req, { tier: 'read' })
  if (error) return error

  const classes = await db.class.findMany({
    where: { teacherId: ctx.dbUserId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      joinCode: true,
      createdAt: true,
      school: { select: { name: true } },
      _count: { select: { users: true } },
      joinRequests: {
        where: { status: 'pending' },
        orderBy: { createdAt: 'asc' },
        take: MAX_PENDING_REQUESTS_PER_CLASS,
        select: {
          id: true,
          createdAt: true,
          user: { select: { name: true } },
        },
      },
    },
  })

  const shaped = classes.map(({ joinRequests, ...c }) => ({
    ...c,
    pendingRequests: joinRequests.map((r) => ({
      id: r.id,
      studentName: r.user.name,
      requestedAt: r.createdAt,
    })),
  }))

  return NextResponse.json({ classes: shaped })
}

const CreateClassBody = z
  .object({
    name: z.string().trim().min(1, 'Class name is required').max(80),
    schoolName: z.string().trim().max(120).optional(),
  })
  .strict()

/**
 * POST /api/teacher/class — create a classroom with a freshly-minted, reusable
 * join code. The school is the teacher's own (if set) or found-or-created from
 * the provided name.
 */
export async function POST(req: NextRequest) {
  const { ctx, error } = await requireTeacher(req, { tier: 'mutate' })
  if (error) return error

  const { data, error: bodyError } = await parseJson(req, CreateClassBody)
  if (bodyError) return bodyError

  // Prefer the teacher's existing school; otherwise create from the supplied name.
  const teacher = await db.user.findUnique({ where: { id: ctx.dbUserId }, select: { schoolId: true } })
  const schoolId = teacher?.schoolId ?? (await resolveSchool(data.schoolName))
  if (!schoolId) {
    return NextResponse.json({ error: 'A school name is required to create a class.' }, { status: 400 })
  }

  // Mint a unique join code, retrying on the rare collision. Every mint sets
  // the expiry window (SEC2-003); regenerating the code later renews it.
  let created: { id: string; name: string; joinCode: string | null } | null = null
  for (let attempt = 0; attempt < 5 && !created; attempt++) {
    try {
      created = await db.class.create({
        data: {
          name: data.name,
          schoolId,
          teacherId: ctx.dbUserId,
          joinCode: generateInviteCode(6),
          joinCodeExpiresAt: classJoinCodeExpiry(),
        },
        select: { id: true, name: true, joinCode: true },
      })
    } catch (err) {
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === 'P2002') {
        continue // join-code collision — try a new code
      }
      throw err
    }
  }
  if (!created) {
    return NextResponse.json({ error: 'Could not generate a unique class code, try again.' }, { status: 503 })
  }

  // A class is a scope of authority, not just a container: every student who
  // joins it becomes readable by this teacher. Recorded once, at creation
  // (REFACTOR2 P1-5).
  await recordSecurityEvent({
    kind: 'provision.class',
    outcome: 'ok',
    actorType: 'teacher',
    actorUserId: ctx.dbUserId,
    targetType: 'class',
    targetId: created.id,
    scopeId: created.id,
    reason: 'class_created',
    dedupeKey: `class_created:${created.id}`,
  })

  return NextResponse.json({ class: created })
}

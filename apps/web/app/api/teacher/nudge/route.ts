import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacher, teacherOwnsTeam } from '@/lib/teacher/auth'
import { parseJson } from '@/lib/validation'
import { truncate } from '@/lib/format'
import { db } from '@/lib/db'

const NudgeBody = z
  .object({
    teamId: z.string().trim().min(1).max(40),
    // Optional custom line; v1 roster UI omits it and always sends the preset.
    note: z.string().trim().min(1).max(280).optional(),
  })
  .strict()

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code?: string }).code === 'P2002'
}

/**
 * POST /api/teacher/nudge — one-click "check in" from the roster (F9). Fires a
 * friendly team notification (kind `teacher_feedback`, so it reuses the existing
 * bell rendering/deep-link) plus a `TeacherFeedback` audit row, at most once per
 * team per UTC calendar day regardless of which teacher clicks — the
 * `Notification.dedupeKey` unique constraint is the idempotency gate, not app
 * logic, so concurrent nudges from two teachers can never double-fire.
 * Scoped: the team must be in the teacher's classes (`teacherOwnsTeam`).
 */
export async function POST(req: NextRequest) {
  const { ctx, error } = await requireTeacher(req, { tier: 'mutate' })
  if (error) return error

  const { data, error: bodyError } = await parseJson(req, NudgeBody)
  if (bodyError) return bodyError

  if (!(await teacherOwnsTeam(ctx.classIds, data.teamId))) {
    return NextResponse.json({ error: 'Not in your classes' }, { status: 403 })
  }

  const teacher = await db.user.findUnique({ where: { id: ctx.dbUserId }, select: { name: true } })
  const who = teacher?.name?.trim() || 'Your teacher'
  const title = `${who} checked in`
  const body = data.note ?? "Log your latest session so your teacher can see where you're at."
  const day = new Date().toISOString().slice(0, 10) // UTC calendar day
  const dedupeKey = `nudge:${data.teamId}:${day}`

  try {
    await db.$transaction(async (tx) => {
      await tx.notification.create({
        data: {
          teamId: data.teamId,
          userId: null, // whole team
          kind: 'teacher_feedback',
          title,
          body: truncate(body),
          linkUrl: '/lab?panel=feedback',
          dedupeKey,
        },
      })
      // Only reached on the first nudge of the day — a duplicate insert above
      // throws before this line runs, so the audit trail never piles up either.
      await tx.teacherFeedback.create({
        data: {
          teamId: data.teamId,
          teacherUserId: ctx.dbUserId,
          targetType: 'team',
          targetId: null,
          body,
        },
      })
    })
    return NextResponse.json({ ok: true, alreadyNudged: false })
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json({ ok: true, alreadyNudged: true })
    }
    throw err
  }
}

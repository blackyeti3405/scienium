import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacher, teacherOwnsTeam } from '@/lib/teacher/auth'
import { parseJson } from '@/lib/validation'
import { truncate } from '@/lib/format'
import { db } from '@/lib/db'

const FeedbackBody = z
  .object({
    teamId: z.string().trim().min(1).max(40),
    targetType: z.enum(['team', 'project_log', 'paper', 'showcase']).optional(),
    targetId: z.string().trim().max(40).optional(),
    body: z.string().trim().min(1, 'Write some feedback').max(2000),
  })
  .strict()

/**
 * POST /api/teacher/feedback — leave feedback a team sees in their own view
 * (spec §15.7). Also drops an in-app notification so the team notices it.
 * Scoped: the team must be in the teacher's classes.
 */
export async function POST(req: NextRequest) {
  const { ctx, error } = await requireTeacher(req, { tier: 'mutate' })
  if (error) return error

  const { data, error: bodyError } = await parseJson(req, FeedbackBody)
  if (bodyError) return bodyError

  if (!(await teacherOwnsTeam(ctx.classIds, data.teamId))) {
    return NextResponse.json({ error: 'Not in your classes' }, { status: 403 })
  }

  // Feedback and the notice about it commit TOGETHER (REFACTOR2 P1-6). The
  // notification used to be a best-effort write after the fact, which is the
  // shape that produces feedback a student is never told about — the same
  // reasoning `recordActivity` encodes for the activity feed. `dedupeKey` is
  // keyed to the feedback row's own id, unique by construction, so it can never
  // collide and take the feedback down with it.
  const feedback = await db.$transaction(async (tx) => {
    const row = await tx.teacherFeedback.create({
      data: {
        teamId: data.teamId,
        teacherUserId: ctx.dbUserId,
        targetType: data.targetType ?? 'team',
        targetId: data.targetId ?? null,
        body: data.body,
      },
    })
    await tx.notification.create({
      data: {
        teamId: data.teamId,
        kind: 'teacher_feedback',
        title: 'New feedback from your teacher',
        body: truncate(data.body),
        linkUrl: '/lab?panel=feedback',
        dedupeKey: `teacher_feedback:${row.id}`,
      },
    })
    return row
  })

  return NextResponse.json({ feedback })
}

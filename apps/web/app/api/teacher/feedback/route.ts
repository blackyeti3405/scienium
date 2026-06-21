import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacher, teacherOwnsTeam } from '@/lib/teacher/auth'
import { parseJson } from '@/lib/validation'
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

  const feedback = await db.teacherFeedback.create({
    data: {
      teamId: data.teamId,
      teacherUserId: ctx.dbUserId,
      targetType: data.targetType ?? 'team',
      targetId: data.targetId ?? null,
      body: data.body,
    },
  })

  // Best-effort team notification (unique dedupe on the feedback id).
  await db.notification
    .create({
      data: {
        teamId: data.teamId,
        kind: 'teacher_feedback',
        title: 'New feedback from your teacher',
        body: data.body.length > 140 ? `${data.body.slice(0, 137)}…` : data.body,
        linkUrl: '/lab',
        dedupeKey: `teacher_feedback:${feedback.id}`,
      },
    })
    .catch(() => {})

  return NextResponse.json({ feedback })
}

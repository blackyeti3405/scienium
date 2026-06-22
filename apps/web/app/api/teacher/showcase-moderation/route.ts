import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacher, teacherOwnsTeam } from '@/lib/teacher/auth'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'

/**
 * GET /api/teacher/showcase-moderation — pending public showcase submissions for
 * teams in the teacher's classes. Scoped to the caller's classIds; no cross-class
 * data is ever returned.
 */
export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeacher(req, { tier: 'read' })
  if (error) return error

  if (ctx.classIds.length === 0) return NextResponse.json({ showcases: [] })

  const showcases = await db.showcase.findMany({
    where: {
      moderationStatus: 'pending_review',
      privacyLevel: 'public',
      team: { members: { some: { user: { classId: { in: ctx.classIds } } } } },
    },
    orderBy: { lastEditedAt: 'asc' },
    select: {
      id: true,
      slug: true,
      shortTitle: true,
      title: true,
      abstract: true,
      lastEditedAt: true,
      team: { select: { name: true, labType: true } },
    },
  })

  return NextResponse.json({ showcases })
}

const DecisionBody = z
  .object({
    showcaseId: z.string().trim().min(1).max(40),
    decision: z.enum(['approve', 'reject']),
    note: z.string().trim().max(500).optional(),
  })
  .strict()

/**
 * POST /api/teacher/showcase-moderation — approve or reject a pending public
 * showcase. Only showcases in `pending_review` and within the teacher's scope can
 * be acted on. Notifies the team on completion.
 */
export async function POST(req: NextRequest) {
  const { ctx, error } = await requireTeacher(req, { tier: 'mutate' })
  if (error) return error

  const { data, error: bodyError } = await parseJson(req, DecisionBody)
  if (bodyError) return bodyError

  const sc = await db.showcase.findUnique({
    where: { id: data.showcaseId },
    select: { id: true, teamId: true, moderationStatus: true, shortTitle: true, title: true },
  })
  if (!sc || sc.moderationStatus !== 'pending_review') {
    return NextResponse.json({ error: 'Showcase not found or not pending review' }, { status: 404 })
  }
  if (!(await teacherOwnsTeam(ctx.classIds, sc.teamId))) {
    return NextResponse.json({ error: 'Not in your classes' }, { status: 403 })
  }

  const approved = data.decision === 'approve'
  const note = data.note?.trim() ?? null

  await db.$transaction(async (tx) => {
    await tx.showcase.update({
      where: { id: sc.id },
      data: {
        moderationStatus: approved ? 'approved' : 'rejected',
        moderatedAt: new Date(),
        moderationNote: note,
      },
    })

    await tx.notification.create({
      data: {
        teamId: sc.teamId,
        kind: 'showcase_reviewed',
        title: approved ? 'Showcase approved — now public' : 'Showcase needs changes',
        body: approved
          ? `Your teacher approved your showcase. It's live in the public gallery.${note ? ` Note: ${note}` : ''}`
          : `Your teacher asked for changes before your showcase goes public.${note ? ` Note: ${note}` : ''}`,
        linkUrl: '/lab',
        dedupeKey: `showcase_reviewed:${sc.id}:${Date.now()}`,
      },
    })
  })

  return NextResponse.json({ ok: true, decision: data.decision })
}

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacher, teacherOwnsTeam } from '@/lib/teacher/auth'
import { parseJson } from '@/lib/validation'
import { logActivity } from '@/lib/activity/log'
import { PHASE_INFO, type Phase } from '@/lib/phase'
import { db } from '@/lib/db'

/**
 * GET /api/teacher/validations — the pending phase-advancement requests for teams
 * in the teacher's classes (spec §15.6). Each carries lightweight evidence (the
 * requester, the team's research idea, ready-paper count) so the teacher can
 * decide in context. Scoped to the teacher's own classes.
 */
export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeacher(req, { tier: 'read' })
  if (error) return error

  if (ctx.classIds.length === 0) return NextResponse.json({ requests: [] })

  const requests = await db.phaseAdvanceRequest.findMany({
    where: {
      status: 'pending',
      team: { members: { some: { user: { classId: { in: ctx.classIds } } } } },
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      fromPhase: true,
      toPhase: true,
      note: true,
      createdAt: true,
      requestedBy: { select: { name: true } },
      team: {
        select: {
          id: true,
          name: true,
          researchIdea: true,
          labType: true,
          _count: { select: { papers: true, projectLogs: true } },
        },
      },
    },
  })

  return NextResponse.json({ requests })
}

const DecisionBody = z
  .object({
    requestId: z.string().trim().min(1).max(40),
    decision: z.enum(['approve', 'reject']),
    note: z.string().trim().max(500).optional(),
  })
  .strict()

/**
 * POST /api/teacher/validations — approve or reject a request. Approval atomically
 * advances the team's phase, records the review, notifies the team, and writes
 * the activity feed. Only pending requests in the teacher's scope can be acted on.
 */
export async function POST(req: NextRequest) {
  const { ctx, error } = await requireTeacher(req, { tier: 'mutate' })
  if (error) return error

  const { data, error: bodyError } = await parseJson(req, DecisionBody)
  if (bodyError) return bodyError

  const request = await db.phaseAdvanceRequest.findUnique({ where: { id: data.requestId } })
  if (!request || request.status !== 'pending') {
    return NextResponse.json({ error: 'Request not found or already reviewed' }, { status: 404 })
  }
  if (!(await teacherOwnsTeam(ctx.classIds, request.teamId))) {
    return NextResponse.json({ error: 'Not in your classes' }, { status: 403 })
  }

  const approved = data.decision === 'approve'
  const toPhase = request.toPhase as Phase

  await db.$transaction(async (tx) => {
    await tx.phaseAdvanceRequest.update({
      where: { id: request.id },
      data: {
        status: approved ? 'approved' : 'rejected',
        reviewedByUserId: ctx.dbUserId,
        reviewedAt: new Date(),
        reviewNote: data.note ?? null,
      },
    })

    if (approved) {
      // Conditional bump: only advance if still on the request's fromPhase, so a
      // double-approval or a concurrent change can't skip the team forward twice.
      await tx.team.updateMany({
        where: { id: request.teamId, phase: request.fromPhase },
        data: { phase: toPhase },
      })
    }

    await tx.notification.create({
      data: {
        teamId: request.teamId,
        kind: 'phase_reviewed',
        title: approved
          ? `Approved: advance to ${PHASE_INFO[toPhase].label}`
          : `Validation needs another look`,
        body: approved
          ? `Your teacher approved your move to the ${PHASE_INFO[toPhase].label} phase.${data.note ? ` Note: ${data.note}` : ''}`
          : `Your teacher asked for changes before advancing.${data.note ? ` Note: ${data.note}` : ''}`,
        linkUrl: '/lab',
        dedupeKey: `phase_reviewed:${request.id}`,
      },
    })
  })

  if (approved) {
    logActivity(request.teamId, ctx.dbUserId, 'phase_advanced', {
      fromPhase: request.fromPhase,
      toPhase,
      byTeacher: true,
    }).catch(console.error)
  }

  return NextResponse.json({ ok: true, decision: data.decision })
}

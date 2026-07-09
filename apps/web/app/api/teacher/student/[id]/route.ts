import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/teacher/auth'
import { db } from '@/lib/db'

/**
 * GET /api/teacher/student/[id] — the phase-adaptive student detail (spec §15.5).
 * Returns the student's shared team context plus the lists a teacher needs to
 * judge progress (papers, recent logs, any pending validation, prior feedback).
 *
 * Scoped: the student must be in one of the teacher's classes, else 404 — so a
 * teacher can't probe arbitrary student ids.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { ctx, error } = await requireTeacher(req, { tier: 'read' })
  if (error) return error

  const student = await db.user.findFirst({
    where: { id: params.id, classId: { in: ctx.classIds } },
    select: {
      id: true,
      name: true,
      activeTeam: { select: { id: true } },
      teamMemberships: {
        orderBy: { joinedAt: 'desc' },
        take: 1,
        select: { team: { select: { id: true } } },
      },
    },
  })
  if (!student) {
    return NextResponse.json({ error: 'Student not found in your classes' }, { status: 404 })
  }

  const teamId = student.activeTeam?.id ?? student.teamMemberships[0]?.team.id ?? null
  if (!teamId) {
    return NextResponse.json({ student: { id: student.id, name: student.name }, team: null })
  }

  const [team, papers, logs, pending, feedback] = await Promise.all([
    db.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        name: true,
        phase: true,
        labType: true,
        topic: true,
        researchIdea: true,
        currency: { select: { kp: true, clearanceLevel: true, lc: true } },
        members: { select: { user: { select: { id: true, name: true } } } },
      },
    }),
    db.paper.findMany({
      where: { teamId, status: 'ready' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true },
      take: 30,
    }),
    db.projectLog.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
      take: 15,
      select: { id: true, entryType: true, stage: true, body: true, createdAt: true },
    }),
    db.phaseAdvanceRequest.findFirst({
      where: { teamId, status: 'pending' },
      select: { id: true, fromPhase: true, toPhase: true, createdAt: true },
    }),
    db.teacherFeedback.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, targetType: true, targetId: true, body: true, resolved: true, createdAt: true },
    }),
  ])

  return NextResponse.json({
    student: { id: student.id, name: student.name },
    team,
    papers,
    logs,
    pendingRequest: pending,
    feedback,
  })
}

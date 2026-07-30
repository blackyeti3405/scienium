import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher, teacherOwnsTeam } from '@/lib/teacher/auth'
import { pickActiveTeam } from '@/lib/team/context'
import { db } from '@/lib/db'
import { streamStoredPdf } from '@/lib/papers/pdf'

/**
 * GET /api/teacher/student/[id]/literature/[paperId]/file
 *
 * Streams the PDF for a paper to an authenticated teacher. Authorisation
 * mirrors apps/web/app/api/papers/[id]/file/route.ts but uses requireTeacher +
 * class/team scope instead of team-context auth.
 *
 * Supports both the R2 path (pdfKey) and the legacy in-DB blob (pdfData).
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string; paperId: string }> }
) {
  const params = await props.params;
  const { ctx, error } = await requireTeacher(req, { tier: 'read' })
  if (error) return error

  // IDOR guard: student must be in one of the teacher's classes.
  const student = await db.user.findFirst({
    where: { id: params.id, classId: { in: ctx.classIds } },
    select: {
      id: true,
      activeTeamId: true,
      teamMemberships: {
        orderBy: { joinedAt: 'desc' },
        select: { teamId: true, team: { select: { id: true } } },
      },
    },
  })

  if (!student) {
    return NextResponse.json({ error: 'Student not found in your classes' }, { status: 404 })
  }

  // Resolve through membership (never a bare activeTeam) — a stale activeTeamId
  // must not pick a team the student has since left.
  const teamId = pickActiveTeam(student.activeTeamId, student.teamMemberships)?.id ?? null
  if (!teamId) {
    return NextResponse.json({ error: 'Student not found in your classes' }, { status: 404 })
  }

  // Belt-and-suspenders: verify teacher owns the team.
  const owned = await teacherOwnsTeam(ctx.classIds, teamId)
  if (!owned) {
    return NextResponse.json({ error: 'Student not found in your classes' }, { status: 404 })
  }

  // Paper must belong to this student's team.
  const paper = await db.paper.findFirst({
    where: { id: params.paperId, teamId },
    select: { pdfKey: true, pdfData: true, title: true },
  })

  if (!paper) {
    return NextResponse.json({ error: 'PDF not available' }, { status: 404 })
  }

  return streamStoredPdf(paper, '[r2] teacher PDF stream failed:')
}

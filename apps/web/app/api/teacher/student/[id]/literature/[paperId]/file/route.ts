import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher, teacherOwnsTeam } from '@/lib/teacher/auth'
import { db } from '@/lib/db'
import { getObjectStream } from '@/lib/storage'

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
  { params }: { params: { id: string; paperId: string } },
) {
  const { ctx, error } = await requireTeacher(req, { tier: 'read' })
  if (error) return error

  // IDOR guard: student must be in one of the teacher's classes.
  const student = await db.user.findFirst({
    where: { id: params.id, classId: { in: ctx.classIds } },
    select: {
      id: true,
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

  const safeName = paper.title.replace(/[^\w.-]+/g, '_').slice(0, 80) || 'paper'
  const headers: Record<string, string> = {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="${safeName}.pdf"`,
    'Cache-Control': 'private, max-age=3600',
  }

  // Preferred path: stream the object straight from R2.
  if (paper.pdfKey) {
    try {
      const { body, contentLength } = await getObjectStream(paper.pdfKey)
      if (contentLength != null) headers['Content-Length'] = String(contentLength)
      return new NextResponse(body, { status: 200, headers })
    } catch (err) {
      console.error('[r2] teacher PDF stream failed:', err)
      return NextResponse.json({ error: 'PDF not available' }, { status: 502 })
    }
  }

  // Legacy fallback: bytes stored in Postgres (pre-migration rows).
  if (paper.pdfData) {
    const bytes = paper.pdfData as Buffer
    headers['Content-Length'] = String(bytes.length)
    return new NextResponse(new Uint8Array(bytes), { status: 200, headers })
  }

  return NextResponse.json({ error: 'PDF not available' }, { status: 404 })
}

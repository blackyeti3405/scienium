import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher, teacherOwnsTeam } from '@/lib/teacher/auth'
import { pickActiveTeam } from '@/lib/team/context'
import { MembershipError, reassignLeadAsTeacher } from '@/lib/team/membership'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * POST /api/teacher/student/[id]/lead — make this student the lead of their lab
 * (REFACTOR2 P1-R8, the capability the team half named and left unbuilt).
 *
 * `POST /api/team/lead` only lets the CURRENT lead hand over, which is no help
 * in the case that motivated it: a lead who has stopped showing up leaves their
 * team unable to remove members, hand over, or manage invites. A teacher is the
 * authority that outlasts the team.
 *
 * Addressed by STUDENT, not by team: the teacher's authorization is already
 * expressed in terms of students in their classes, and the team is derived from
 * the student — so there is no team id in the request for a caller to swap.
 *
 * Two-step scoping, the same shape `DELETE /api/teacher/class/students/[id]`
 * uses: the student is looked up scoped by `ctx.classIds`, and the resolved team
 * is independently re-proven with `teacherOwnsTeam` before the command runs.
 * Every miss answers 404, so a teacher cannot probe ids.
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const { ctx, error } = await requireTeacher(req, { tier: 'mutate' })
  if (error) return error

  if (ctx.classIds.length === 0) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  const student = await db.user.findFirst({
    where: { id: params.id, classId: { in: ctx.classIds } },
    select: {
      id: true,
      name: true,
      activeTeamId: true,
      teamMemberships: {
        orderBy: { joinedAt: 'desc' },
        select: { teamId: true, team: { select: { id: true } } },
      },
    },
  })
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  // Resolve through membership, never a bare `activeTeamId` — the same rule the
  // student-overview service follows.
  const teamId = pickActiveTeam(student.activeTeamId, student.teamMemberships)?.id ?? null
  if (!teamId) {
    return NextResponse.json({ error: 'That student is not in a lab' }, { status: 404 })
  }

  try {
    await reassignLeadAsTeacher({
      teamId,
      toUserId: student.id,
      actorUserId: ctx.dbUserId,
      ownsTeam: await teacherOwnsTeam(ctx.classIds, teamId),
    })
    return NextResponse.json({ ok: true, teamLeadId: student.id, studentName: student.name })
  } catch (err) {
    if (err instanceof MembershipError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    throw err
  }
}

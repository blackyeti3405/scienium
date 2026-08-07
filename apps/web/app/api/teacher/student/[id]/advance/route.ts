import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher, teacherOwnsTeam } from '@/lib/teacher/auth'
import { pickActiveTeam } from '@/lib/team/context'
import { PHASE_ORDER, PHASE_INFO, type Phase } from '@/lib/phase'
import { advanceTeamPhase } from '@/lib/team/advance'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * POST /api/teacher/student/[id]/advance — move this student's lab to the next
 * phase.
 *
 * A lab whose members belong to a class does NOT pace itself (see
 * `isTeacherPaced`): its teacher is running a unit, and a lab that raced ahead
 * would sit in a phase the rest of the room has not reached. `POST
 * /api/team/advance-phase` refuses those labs with `teacherPaced: true` — this is
 * the lever that answers it. Without it a classroom lab would have no way
 * forward at all.
 *
 * Addressed by STUDENT, not by team, and scoped the same way
 * `POST /api/teacher/student/[id]/lead` is: the student is looked up scoped by
 * `ctx.classIds`, the resolved team is independently re-proven with
 * `teacherOwnsTeam`, and every miss answers 404 so a teacher cannot probe ids.
 *
 * Deliberately has NO gate of its own. The literature requirement (25 sources,
 * every member proficient) is what a lab must clear to advance ITSELF; a teacher
 * overriding it is the entire point of teacher pacing — a room moves together
 * even when one lab is behind. It also spends no Anthropic call: the lab type is
 * assigned from the topic at the topic lock, which has already happened by the
 * time a teacher is advancing anyone.
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
        select: { teamId: true, team: { select: { id: true, phase: true } } },
      },
    },
  })
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  // Resolve through membership, never a bare `activeTeamId`.
  const team = pickActiveTeam(student.activeTeamId, student.teamMemberships)
  if (!team) {
    return NextResponse.json({ error: 'That student is not in a lab' }, { status: 404 })
  }
  if (!(await teacherOwnsTeam(ctx.classIds, team.id))) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  const from = team.phase as Phase
  const next = PHASE_ORDER[PHASE_ORDER.indexOf(from) + 1] as Phase | undefined
  if (!next) {
    return NextResponse.json(
      { error: `${student.name}'s lab is already in the final phase.` },
      { status: 400 },
    )
  }

  // Compare-and-set on `from`, so two teachers clicking at once move the lab one
  // phase, not two, and only the winner stamps the phase clock.
  const advanced = await advanceTeamPhase(team.id, ctx.dbUserId, from, next)

  return NextResponse.json({
    ok: true,
    advanced,
    studentName: student.name,
    phase: advanced ? next : from,
    phaseLabel: PHASE_INFO[advanced ? next : from].label,
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/teacher/auth'
import { removeFromClass } from '@/lib/onboarding/class-membership'
import { db } from '@/lib/db'

/**
 * DELETE /api/teacher/class/students/[id] — the teacher un-enrols a student
 * (REFACTOR2 P1-R8, class half).
 *
 * `decideClassJoin` deliberately refused to do this: denying a request that was
 * already approved is not the same act as removing an enrolled student, and
 * conflating them is how one silently becomes the other. This is that separate
 * command.
 *
 * Two-step scoping, both required:
 *  1. the student must currently be in a class THIS teacher owns — the lookup is
 *     scoped by `ctx.classIds`, never fetch-by-id-then-check;
 *  2. that same class id is passed into the command and re-checked inside its
 *     transaction, so a student who moved between the check and the write is not
 *     removed on an authorization that no longer applies.
 */
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const { ctx, error } = await requireTeacher(req, { tier: 'mutate' })
  if (error) return error

  if (ctx.classIds.length === 0) {
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  const student = await db.user.findFirst({
    where: { id: params.id, classId: { in: ctx.classIds } },
    select: { id: true, classId: true, name: true },
  })
  if (!student?.classId) {
    // A student outside this teacher's classes and one that does not exist
    // answer identically.
    return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  }

  const outcome = await removeFromClass(student.classId, student.id, ctx.dbUserId)
  if (!outcome.committed) {
    return NextResponse.json(
      { error: 'That student is no longer in this class. Reload the roster.' },
      { status: 409 },
    )
  }

  return NextResponse.json({ ok: true, removed: student.name })
}

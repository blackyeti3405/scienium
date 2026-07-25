import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacher } from '@/lib/teacher/auth'
import { parseJson } from '@/lib/validation'
import { decideClassJoin } from '@/lib/onboarding/profile'
import { db } from '@/lib/db'

const DecideBody = z.object({ decision: z.enum(['approve', 'deny']) }).strict()

/**
 * POST /api/teacher/class/requests/[id] — approve or deny a pending class-join
 * request. Strictly scoped: the request's class must be one THIS teacher owns
 * (`ctx.classIds`), so a teacher can never decide another teacher's request.
 *
 * Approve → enrols the student into the class (per-student membership: never
 *            their teammates or the team row).
 * Deny     → marks the request denied; the student is not enrolled and can
 *            re-request later (which re-opens the row as pending).
 *
 * Both decisions run through one compare-and-set (P1-S2). The route no longer
 * acts on its own pre-read: that snapshot let approve silently no-op while still
 * answering `{ ok: true }`, and let deny overwrite an already-approved request
 * unconditionally, leaving a student enrolled against a DENIED row.
 */
export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { ctx, error } = await requireTeacher(req, { tier: 'mutate' })
  if (error) return error

  const { data, error: bodyError } = await parseJson(req, DecideBody)
  if (bodyError) return bodyError

  // Ownership + existence in one scoped query — never fetch-by-id-then-check.
  // This is an AUTHORIZATION check, not the state check: `decideClassJoin` owns
  // the pending→decided transition and is the only thing allowed to conclude the
  // request was still open.
  const request = await db.classJoinRequest.findFirst({
    where: { id: params.id, class: { teacherId: ctx.dbUserId } },
    select: { id: true },
  })
  if (!request) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }

  const outcome = await decideClassJoin(request.id, ctx.dbUserId, data.decision)
  if (!outcome.committed) {
    return NextResponse.json(
      {
        error: `This request was already ${outcome.status}. Reload the queue to see the current state.`,
        status: outcome.status,
      },
      { status: 409 },
    )
  }

  return NextResponse.json({ ok: true, decision: outcome.decision })
}

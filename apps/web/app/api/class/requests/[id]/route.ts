import { NextRequest, NextResponse } from 'next/server'
import { requireUserContext } from '@/lib/api/route-context'
import { withdrawClassRequest } from '@/lib/onboarding/class-membership'
import { db } from '@/lib/db'

/**
 * DELETE /api/class/requests/[id] — the student withdraws their own pending
 * class-join request (REFACTOR2 P1-R8, class half).
 *
 * A request filed against the wrong code used to sit in a teacher's queue
 * forever with no way for the student to take it back.
 *
 * The command itself carries the ownership check — `userId` is part of the
 * write predicate, not a pre-read — so a guessed id belonging to another student
 * matches nothing. It is also a compare-and-set on `pending`: a withdrawal can
 * never undo a decision a teacher has already made.
 */
export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const { ctx, error } = await requireUserContext(req, { tier: 'mutate' })
  if (error) return error

  const user = await db.user.findUnique({
    where: { clerkUserId: ctx.userId },
    select: { id: true },
  })
  if (!user) return NextResponse.json({ error: 'Complete onboarding first' }, { status: 404 })

  const outcome = await withdrawClassRequest(params.id, user.id)
  if (!outcome.committed) {
    // A request that is not the caller's and one that does not exist answer
    // identically — the endpoint must not confirm that an id is real.
    if (outcome.reason === 'not_found') {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }
    return NextResponse.json(
      { error: 'That request has already been decided. Reload to see where you stand.' },
      { status: 409 },
    )
  }

  return NextResponse.json({ ok: true })
}

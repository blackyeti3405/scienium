import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeacher } from '@/lib/teacher/auth'
import { parseJson } from '@/lib/validation'
import { approveClassJoin } from '@/lib/onboarding/profile'
import { db } from '@/lib/db'

const DecideBody = z.object({ decision: z.enum(['approve', 'deny']) }).strict()

/**
 * POST /api/teacher/class/requests/[id] — approve or deny a pending class-join
 * request. Strictly scoped: the request's class must be one THIS teacher owns
 * (`ctx.classIds`), so a teacher can never decide another teacher's request.
 *
 * Approve → enrolls the student (and any lab they lead) into the class.
 * Deny     → marks the request denied; the student is not enrolled and can
 *            re-request later (which re-opens the row as pending).
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { ctx, error } = await requireTeacher(req, { tier: 'mutate' })
  if (error) return error

  const { data, error: bodyError } = await parseJson(req, DecideBody)
  if (bodyError) return bodyError

  // Ownership + existence in one scoped query — never fetch-by-id-then-check.
  const request = await db.classJoinRequest.findFirst({
    where: { id: params.id, status: 'pending', class: { teacherId: ctx.dbUserId } },
    select: { id: true },
  })
  if (!request) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 })
  }

  if (data.decision === 'approve') {
    await approveClassJoin(request.id, ctx.dbUserId)
  } else {
    await db.classJoinRequest.update({
      where: { id: request.id },
      data: { status: 'denied', decidedAt: new Date(), decidedByUserId: ctx.dbUserId },
    })
  }

  return NextResponse.json({ ok: true, decision: data.decision })
}

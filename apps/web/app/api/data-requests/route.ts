import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { assertSameOrigin } from '@/lib/api/route-context'
import { enforceRateLimit, type TierName } from '@/lib/rate-limit'
import { parseJson } from '@/lib/validation'
import { fileDataRequest, type DataRequestKind } from '@/lib/data-requests/workflow'
import { db } from '@/lib/db'

/**
 * The subject's own data requests (REFACTOR2 P1-R9).
 *
 * Deliberately NOT behind `requireTeamContext`. Every other authenticated route
 * here is team-scoped, but a student who has just left their lab is exactly the
 * person most likely to want a copy of their work or its erasure — gating this
 * on having a team would lock out the case it exists for. So the guard is the
 * plain one: signed in, rate limited, same origin, and scoped to yourself.
 *
 * Filing does not erase anything. The request is queued for an operator
 * (`POST /api/cron/data-requests`); see `lib/data-requests/workflow.ts` for why
 * a signed-in student cannot execute their own erasure.
 */

const Body = z.object({ kind: z.enum(['export', 'delete']) }).strict()

/** Signed-in user, resolved to the internal row. No team required. */
async function requireSubject(req: NextRequest, tier: TierName) {
  const { userId } = await auth()
  if (!userId) return { subject: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const limited = await enforceRateLimit(req, tier, userId)
  if (limited) return { subject: null, error: limited }

  const crossOrigin = assertSameOrigin(req)
  if (crossOrigin) return { subject: null, error: crossOrigin }

  const subject = await db.user.findUnique({
    where: { clerkUserId: userId },
    select: { id: true, clerkUserId: true, email: true, deletedAt: true },
  })
  if (!subject || subject.deletedAt) {
    return { subject: null, error: NextResponse.json({ error: 'No account found' }, { status: 404 }) }
  }
  return { subject, error: null }
}

/** GET /api/data-requests — this subject's own requests, newest first. */
export async function GET(req: NextRequest) {
  const { subject, error } = await requireSubject(req, 'read')
  if (error) return error

  const requests = await db.dataRequest.findMany({
    where: { subjectUserId: subject.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: { id: true, kind: true, status: true, createdAt: true, completedAt: true },
  })
  return NextResponse.json({ requests })
}

/** POST /api/data-requests — file a request (idempotent per subject/kind/day). */
export async function POST(req: NextRequest) {
  const { subject, error } = await requireSubject(req, 'mutate')
  if (error) return error

  const parsed = await parseJson(req, Body)
  if (parsed.error) return parsed.error

  const filed = await fileDataRequest({
    kind: parsed.data.kind as DataRequestKind,
    subject: { id: subject.id, clerkUserId: subject.clerkUserId, email: subject.email },
    requestedByUserId: subject.id,
  })

  return NextResponse.json({
    request: {
      id: filed.id,
      kind: filed.kind,
      status: filed.status,
      createdAt: filed.createdAt,
      completedAt: filed.completedAt,
    },
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { createProjectLogEntry, listProjectLog } from '@/lib/logs/project-log-service'

/**
 * /api/project-log — thin adapter (Track B P1-2): select the policy, parse
 * input with Zod, call ONE application operation, map the typed result to
 * HTTP. The pagination/numbering read and the attach-and-award write live in
 * `lib/logs/project-log-service.ts`.
 */

const Body = z.object({
  body: z.string().min(1).max(5000),
  nextSteps: z.string().min(1).max(2000),
  stage: z.string().min(1, 'Select a project stage').max(100),
  // Bounded to avoid storage-bloat; ids are further intersected with the
  // team's actual roster before persisting (see the service). Attendance is
  // required for multi-member teams (enforced there — it knows the roster).
  attendeeIds: z.array(z.string().max(64)).max(50).default([]),
  // Relative streaming paths into our own attachment view route. Bounded in
  // both count and length so a single entry can't store an unbounded blob.
  attachmentUrls: z
    .array(z.string().max(400).startsWith('/api/project-log/attachment/view'))
    .min(1, 'At least one photo is required')
    .max(20),
}).strict()

export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'read' })
  if (error) return error

  const cursor = req.nextUrl.searchParams.get('cursor')
  const result = await listProjectLog(
    { teamId: ctx.teamId, dbUserId: ctx.dbUserId, labType: ctx.labType },
    cursor,
  )
  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const { ctx, error: guardError } = await requireTeamContext(req, { tier: 'mutate' })
  if (guardError) return guardError

  const { data, error } = await parseJson(req, Body)
  if (error) return error

  const result = await createProjectLogEntry(
    { teamId: ctx.teamId, dbUserId: ctx.dbUserId, labType: ctx.labType },
    { ...data, attendeeIds: data.attendeeIds ?? [] },
  )
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json({ entry: result.entry, lcAward: result.lcAward }, { status: 201 })
}

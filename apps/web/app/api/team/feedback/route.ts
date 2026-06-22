import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'

/**
 * GET /api/team/feedback — list teacher feedback for the caller's team, plus an
 * unresolved count for the badge. Scoped entirely by ctx.teamId, so cross-team
 * reads are structurally impossible.
 */
export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'read' })
  if (error) return error

  const [items, unresolvedCount] = await Promise.all([
    db.teacherFeedback.findMany({
      where: { teamId: ctx.teamId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        targetType: true,
        targetId: true,
        body: true,
        resolved: true,
        createdAt: true,
        teacher: { select: { name: true } },
      },
    }),
    db.teacherFeedback.count({ where: { teamId: ctx.teamId, resolved: false } }),
  ])

  return NextResponse.json({ items, unresolvedCount })
}

const PatchBody = z
  .object({
    id: z.string().trim().min(1).max(40),
    resolved: z.boolean(),
  })
  .strict()

/**
 * PATCH /api/team/feedback — toggle the resolved flag on a feedback note.
 * The teamId: ctx.teamId clause in updateMany ensures a student can only
 * mutate feedback belonging to their own team (IDOR-safe).
 */
export async function PATCH(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'mutate' })
  if (error) return error

  const { data, error: bodyError } = await parseJson(req, PatchBody)
  if (bodyError) return bodyError

  const result = await db.teacherFeedback.updateMany({
    where: { id: data.id, teamId: ctx.teamId },
    data: { resolved: data.resolved },
  })

  return NextResponse.json({ updated: result.count })
}

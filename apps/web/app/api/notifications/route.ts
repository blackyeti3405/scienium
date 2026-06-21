import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'

/** Notifications visible to this member: team-wide (userId null) or addressed to them. */
function visibilityWhere(teamId: string, dbUserId: string) {
  return { teamId, OR: [{ userId: null }, { userId: dbUserId }] }
}

/**
 * GET /api/notifications — recent in-app notifications for the signed-in member,
 * plus the unread count for the bell badge. Not phase-gated: notifications can
 * arrive at any phase (e.g. fair deadlines from day one).
 */
export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'read' })
  if (error) return error

  const where = visibilityWhere(ctx.teamId, ctx.dbUserId)
  const [items, unreadCount] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { id: true, kind: true, title: true, body: true, linkUrl: true, readAt: true, createdAt: true },
    }),
    db.notification.count({ where: { ...where, readAt: null } }),
  ])

  return NextResponse.json({ items, unreadCount })
}

const ReadBody = z
  .object({
    ids: z.array(z.string().max(40)).max(50).optional(),
    all: z.boolean().optional(),
  })
  .strict()
  .refine((b) => b.all || (b.ids && b.ids.length > 0), {
    message: 'Provide ids or all:true',
  })

/** POST /api/notifications — mark notifications read (scoped to the member's own). */
export async function POST(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'mutate' })
  if (error) return error

  const { data, error: bodyError } = await parseJson(req, ReadBody)
  if (bodyError) return bodyError

  const where = data.all
    ? { ...visibilityWhere(ctx.teamId, ctx.dbUserId), readAt: null }
    : { ...visibilityWhere(ctx.teamId, ctx.dbUserId), id: { in: data.ids! } }

  const result = await db.notification.updateMany({ where, data: { readAt: new Date() } })
  return NextResponse.json({ updated: result.count })
}

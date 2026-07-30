import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { requireUserContext } from '@/lib/api/route-context'
import { resolveUserAndTeam } from '@/lib/team/context'
import { parseJson } from '@/lib/validation'
import { db } from '@/lib/db'

/**
 * Notifications visible to this member:
 *
 *  - anything addressed to them personally, **whatever team it names** — a
 *    notice about a class or team membership that ENDED is written when the
 *    student may already have no live team, and scoping it to `ctx.teamId` made
 *    exactly the notices that matter most structurally unreadable
 *    (HANDOFF #4/#5);
 *  - team-wide rows (`userId` null) for the team they are currently acting as.
 *
 * A team-wide row is NOT visible to a member who has left: they are no longer
 * on that team, and the personal clause is what carries anything they are still
 * owed.
 */
function visibilityWhere(teamId: string | null, dbUserId: string): Prisma.NotificationWhereInput {
  const clauses: Prisma.NotificationWhereInput[] = [{ userId: dbUserId }]
  if (teamId) clauses.push({ teamId, userId: null })
  return { OR: clauses }
}

/**
 * GET /api/notifications — recent in-app notifications for the signed-in member,
 * plus the unread count for the bell badge. Not phase-gated: notifications can
 * arrive at any phase (e.g. fair deadlines from day one).
 *
 * Read state is PER MEMBER (`NotificationRead`), not a column on the shared row
 * (REFACTOR2 P2-S3): one teammate opening the bell used to clear everyone's
 * badge.
 */
export async function GET(req: NextRequest) {
  const { ctx, error } = await requireUserContext(req, { tier: 'read' })
  if (error) return error

  const resolved = await resolveUserAndTeam(ctx.userId)
  if (!resolved) return NextResponse.json({ error: 'No user found' }, { status: 404 })
  const { dbUserId } = resolved
  const where = visibilityWhere(resolved.team?.id ?? null, dbUserId)

  const [rows, unreadCount] = await Promise.all([
    db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        kind: true,
        title: true,
        body: true,
        linkUrl: true,
        createdAt: true,
        reads: { where: { userId: dbUserId }, select: { readAt: true } },
      },
    }),
    db.notification.count({ where: { ...where, reads: { none: { userId: dbUserId } } } }),
  ])

  // The client contract is unchanged — `readAt` is still one nullable timestamp
  // per item; it is now THIS member's receipt rather than the team's.
  const items = rows.map(({ reads, ...n }) => ({ ...n, readAt: reads[0]?.readAt ?? null }))
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

/** POST /api/notifications — mark notifications read for the CALLER alone. */
export async function POST(req: NextRequest) {
  const { ctx, error } = await requireUserContext(req, { tier: 'mutate' })
  if (error) return error

  const { data, error: bodyError } = await parseJson(req, ReadBody)
  if (bodyError) return bodyError

  const resolved = await resolveUserAndTeam(ctx.userId)
  if (!resolved) return NextResponse.json({ error: 'No user found' }, { status: 404 })
  const { dbUserId } = resolved

  // Still scoped by visibility: a guessed id from another team must not become a
  // receipt. `all` is bounded by the same 30-row window the bell renders.
  const where = visibilityWhere(resolved.team?.id ?? null, dbUserId)
  const targets = await db.notification.findMany({
    where: data.all
      ? { ...where, reads: { none: { userId: dbUserId } } }
      : { ...where, id: { in: data.ids! } },
    select: { id: true },
    take: 200,
  })
  if (targets.length === 0) return NextResponse.json({ updated: 0 })

  const result = await db.notificationRead.createMany({
    data: targets.map((t) => ({ notificationId: t.id, userId: dbUserId })),
    skipDuplicates: true,
  })
  return NextResponse.json({ updated: result.count })
}

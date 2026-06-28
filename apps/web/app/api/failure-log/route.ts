import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { logActivity } from '@/lib/activity/log'
import { db } from '@/lib/db'

// Body is stored as JSON string: { happened, learned }
const Body = z.object({
  happened: z.string().min(1).max(1500),
  learned: z.string().min(1).max(1500),
}).strict()

export async function GET(req: NextRequest) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'read' })
  if (error) return error

  const rows = await db.projectLog.findMany({
    where: { teamId: ctx.teamId, entryType: 'failure' },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      body: true,
      createdAt: true,
      lastEditedAt: true,
      createdBy: { select: { id: true, name: true } },
      lastEditedBy: { select: { id: true, name: true } },
      followups: {
        select: { id: true, question: true, response: true, answeredAt: true },
        take: 1,
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  // body is stored as JSON: { happened, learned }
  const entries = rows.map((r) => {
    let parsed = { happened: r.body, learned: '' }
    try { parsed = JSON.parse(r.body) } catch {}
    const fu = r.followups[0]
    return {
      id: r.id,
      ...parsed,
      createdAt: r.createdAt,
      author: r.createdBy.name,
      authorId: r.createdBy.id,
      editedBy: r.lastEditedBy?.name ?? null,
      editedAt: r.lastEditedAt ?? null,
      followup: fu
        ? {
            id: fu.id,
            question: fu.question,
            response: fu.response,
            answeredAt: fu.answeredAt ? fu.answeredAt.toISOString() : null,
          }
        : null,
    }
  })

  return NextResponse.json({ entries, currentUserId: ctx.dbUserId })
}

export async function POST(req: NextRequest) {
  const { ctx, error: guardError } = await requireTeamContext(req, { tier: 'mutate' })
  if (guardError) return guardError

  const { data, error } = await parseJson(req, Body)
  if (error) return error

  const entry = await db.projectLog.create({
    data: {
      teamId: ctx.teamId,
      createdByUserId: ctx.dbUserId,
      entryType: 'failure',
      body: JSON.stringify({ happened: data.happened.trim(), learned: data.learned.trim() }),
    },
    select: {
      id: true,
      body: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true } },
    },
  })

  let parsed = { happened: entry.body, learned: '' }
  try { parsed = JSON.parse(entry.body) } catch {}

  logActivity(ctx.teamId, ctx.dbUserId, 'log_created', { kind: 'failure' }).catch(console.error)

  // +1 LC the first time this member files a log today (real calendar day, team pool).
  try {
    const today = new Date()
    const day = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
    await db.$transaction(async (tx) => {
      await tx.labCreditClaim.create({ data: { userId: ctx.dbUserId, teamId: ctx.teamId, day } })
      await tx.teamCurrency.update({ where: { teamId: ctx.teamId }, data: { lc: { increment: 1 } } })
    })
  } catch {
    // P2002 (claim already exists today) = already credited; ignore. Never block the log.
  }

  return NextResponse.json({
    entry: {
      id: entry.id,
      ...parsed,
      createdAt: entry.createdAt,
      author: entry.createdBy.name,
      authorId: entry.createdBy.id,
      editedBy: null,
      editedAt: null,
      followup: null,
    },
  }, { status: 201 })
}

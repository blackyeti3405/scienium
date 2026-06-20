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
    },
  })

  // body is stored as JSON: { happened, learned }
  const entries = rows.map((r) => {
    let parsed = { happened: r.body, learned: '' }
    try { parsed = JSON.parse(r.body) } catch {}
    return {
      id: r.id,
      ...parsed,
      createdAt: r.createdAt,
      author: r.createdBy.name,
      authorId: r.createdBy.id,
      editedBy: r.lastEditedBy?.name ?? null,
      editedAt: r.lastEditedAt ?? null,
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

  return NextResponse.json({
    entry: {
      id: entry.id,
      ...parsed,
      createdAt: entry.createdAt,
      author: entry.createdBy.name,
      authorId: entry.createdBy.id,
      editedBy: null,
      editedAt: null,
    },
  }, { status: 201 })
}

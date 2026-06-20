import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireTeamContext } from '@/lib/api/route-context'
import { parseJson } from '@/lib/validation'
import { logActivity } from '@/lib/activity/log'
import { db } from '@/lib/db'

const Body = z.object({
  happened: z.string().min(1).max(1500),
  learned: z.string().min(1).max(1500),
}).strict()

// PATCH — edit a failure entry. Author-only.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { ctx, error: guardError } = await requireTeamContext(req, { tier: 'mutate' })
  if (guardError) return guardError

  // Shared log — any team member may edit any entry.
  const existing = await db.projectLog.findFirst({
    where: { id: params.id, teamId: ctx.teamId, entryType: 'failure' },
    select: { id: true },
  })
  if (!existing) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })

  const { data, error } = await parseJson(req, Body)
  if (error) return error

  const entry = await db.projectLog.update({
    where: { id: existing.id },
    data: {
      body: JSON.stringify({ happened: data.happened.trim(), learned: data.learned.trim() }),
      lastEditedByUserId: ctx.dbUserId,
      lastEditedAt: new Date(),
    },
    select: {
      id: true,
      body: true,
      createdAt: true,
      lastEditedAt: true,
      createdBy: { select: { id: true, name: true } },
      lastEditedBy: { select: { id: true, name: true } },
    },
  })

  let parsed = { happened: entry.body, learned: '' }
  try { parsed = JSON.parse(entry.body) } catch {}

  logActivity(ctx.teamId, ctx.dbUserId, 'log_edited', { kind: 'failure' }).catch(console.error)

  return NextResponse.json({
    entry: {
      id: entry.id,
      ...parsed,
      createdAt: entry.createdAt,
      author: entry.createdBy.name,
      authorId: entry.createdBy.id,
      editedBy: entry.lastEditedBy?.name ?? null,
      editedAt: entry.lastEditedAt ?? null,
    },
  })
}

// DELETE — remove a failure entry. Author-only.
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { ctx, error } = await requireTeamContext(req, { tier: 'mutate' })
  if (error) return error

  // Shared log — any team member may delete; the act is recorded in the feed.
  const existing = await db.projectLog.findFirst({
    where: { id: params.id, teamId: ctx.teamId, entryType: 'failure' },
    select: { id: true },
  })
  if (!existing) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })

  await db.projectLog.delete({ where: { id: existing.id } })

  logActivity(ctx.teamId, ctx.dbUserId, 'log_deleted', { kind: 'failure' }).catch(console.error)

  return NextResponse.json({ ok: true })
}

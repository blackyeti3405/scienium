import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getTeamContext } from '@/lib/phase'
import { enforceRateLimit } from '@/lib/rate-limit'
import { parseJson } from '@/lib/validation'
import { logActivity } from '@/lib/activity/log'
import { db } from '@/lib/db'

const Body = z.object({
  happened: z.string().min(1).max(1500),
  learned: z.string().min(1).max(1500),
}).strict()

// PATCH — edit a failure entry. Author-only.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = enforceRateLimit(req, 'mutate', userId)
  if (limited) return limited

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  const dbUser = await db.user.findUnique({ where: { clerkUserId: userId }, select: { id: true } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

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
      lastEditedByUserId: dbUser.id,
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

  logActivity(ctx.teamId, dbUser.id, 'log_edited', { kind: 'failure' }).catch(console.error)

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
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = enforceRateLimit(req, 'mutate', userId)
  if (limited) return limited

  const ctx = await getTeamContext(userId)
  if (!ctx) return NextResponse.json({ error: 'No team found' }, { status: 404 })

  const dbUser = await db.user.findUnique({ where: { clerkUserId: userId }, select: { id: true } })
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Shared log — any team member may delete; the act is recorded in the feed.
  const existing = await db.projectLog.findFirst({
    where: { id: params.id, teamId: ctx.teamId, entryType: 'failure' },
    select: { id: true },
  })
  if (!existing) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })

  await db.projectLog.delete({ where: { id: existing.id } })

  logActivity(ctx.teamId, dbUser.id, 'log_deleted', { kind: 'failure' }).catch(console.error)

  return NextResponse.json({ ok: true })
}
